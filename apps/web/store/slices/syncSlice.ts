import { StateCreator } from 'zustand';
import { toast } from 'sonner';
import type {
  DailyNote,
  DailyNoteSaveAck,
  HabitCompletion,
  Item,
  NormalItem,
  Note,
  NoteSaveAck,
  NoteSummary,
  TaskItem,
} from '@cadence/types';

import { addHabitItem } from '@/api/addHabitItem';
import { addNormalItem } from '@/api/addNormalItem';
import { addTaskItem } from '@/api/addTaskItem';
import { createDailyNote } from '@/api/createDailyNote';
import { createFolder } from '@/api/createFolder';
import { createNote } from '@/api/createNote';
import { deleteFolder } from '@/api/deleteFolder';
import { deleteNote } from '@/api/deleteNote';
import { getDailyNotes } from '@/api/getDailyNotes';
import { getFolders } from '@/api/getFolders';
import { getHabitCompletions } from '@/api/getHabitCompletions';
import { getItems } from '@/api/getItems';
import { getNotes } from '@/api/getNotes';
import { updateFolder } from '@/api/updateFolder';
import { updateNote } from '@/api/updateNote';
import { ApiError, errorCodeOf, isRetryableError } from '@/lib/api/request';
import {
  completionFailureMessage,
  createFailureMessage,
  treeFailureMessage,
} from '@/lib/sync/messages';
import { readPersistedSync, writePersistedSync } from '@/lib/sync/storage';
import {
  draftKey,
  type Draft,
  type DraftScope,
  type NewSyncOp,
  type SyncOp,
} from '@/lib/sync/types';
import { daySettingsFor, getCadenceDate } from '@/lib/cadenceDate';
import { needsOnboarding } from '@/lib/onboarding';
import { newId } from '@/lib/uuid';

import type { CadenceAppStore } from '../types';

/*
 * ===========================================================================
 * Sync engine
 * ===========================================================================
 *
 * One place that owns "has the server got this yet?".
 *
 *   enqueue / runOrQueue   discrete operations (FIFO outbox)
 *   saveDraft              document content (latest text per document)
 *   flushSync              replays the outbox, then sends drafts
 *   reconcile              re-reads server state after a sync, so changes
 *                          made on another device show up
 *
 * "Online" means the Socket.IO connection is up: that is the one signal that
 * the backend itself (not just the network) is reachable. Every successful
 * write is idempotent on the server, so anything whose answer was lost is
 * simply sent again.
 *
 * Failure handling:
 *   retryable  (offline, 5xx, timeout, expired session) -> stop, back off,
 *              try again; nothing is dropped.
 *   permanent  (the server says no: past day, deleted elsewhere, invalid)
 *              -> drop that one change, undo it on screen, tell the user
 *              in plain words, and re-read server state.
 */

const ACK_TIMEOUT_MS = 15_000;
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 30_000;

/** Local ids for optimistic habit completions (replaced by the server's). */
const LOCAL_COMPLETION_PREFIX = 'local:';

type AckResponse<T> = { ok: true; data: T } | { ok: false; code: string };

type CompleteResult =
  | { kind: 'normal'; item: NormalItem }
  | { kind: 'task'; item: TaskItem }
  | { kind: 'habit'; completion: HabitCompletion };

/** A socket ack that never came back, or an ack that said no. */
class AckError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, retryable: boolean) {
    super(code);
    this.code = code;
    this.retryable = retryable;
  }
}

/*
 * Socket ack codes that will fail the same way if sent again. Everything
 * else (database hiccups, auth refresh races, timeouts) is retried.
 */
const PERMANENT_ACK_CODES = new Set([
  'INVALID_COMPLETION_REQUEST',
  'ITEM_NOT_FOUND',
  'DAY_ENDED',
  'TASK_NOT_YET_DUE',
  'ITEM_LOCKED',
  'HABIT_NOT_DUE_TODAY',
  'UNSUPPORTED_ITEM_KIND',
  'INVALID_SAVE_ID',
  'INVALID_NOTE_ID',
  'INVALID_NOTE_CONTENT',
  'INVALID_DAILY_NOTE_ID',
  'INVALID_DAILY_NOTE_CONTENT',
  'NOTE_NOT_FOUND',
  'DAILY_NOTE_NOT_FOUND',
]);

function isRetryable(error: unknown) {
  return error instanceof AckError ? error.retryable : isRetryableError(error);
}

function codeOf(error: unknown) {
  return error instanceof AckError ? error.code : errorCodeOf(error);
}

/** Server save ids must be unique per socket; any increasing number works. */
let saveCounter = 0;

/* Engine bookkeeping that is not UI state. */

/**
 * Operations run one at a time, in order, whether they come from the outbox
 * or straight from a user action (runOrQueue). Without this a quick
 * "create folder, then rename it" could reach the server in reverse.
 */
let opLock: Promise<unknown> = Promise.resolve();

function withOpLock<T>(task: () => Promise<T>): Promise<T> {
  const run = opLock.then(task, task);
  opLock = run.catch(() => undefined);
  return run;
}

let flushing = false;
let flushAgain = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
let reconcileNeeded = false;

/** Local Daily Note id -> the server's id it was merged into. */
const adoptedDailyIds = new Map<string, string>();

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'waiting';

export interface syncState {
  /** Whose outbox is loaded; null before sign-in data is ready. */
  syncUserId: string | null;

  outbox: SyncOp[];
  drafts: Record<string, Draft>;

  /** Draft key -> revision currently being saved. Not persisted. */
  draftsInFlight: Record<string, number>;

  /** Draft key -> code of a permanent content failure (e.g. too large). */
  draftErrors: Record<string, string>;

  isSyncing: boolean;

  /** When the next automatic retry runs (ms epoch), after a failure. */
  syncRetryAt: number | null;

  /** localStorage refused a write; changes live only in memory for now. */
  syncStorageFailed: boolean;

  /** The server rejected the session; the user has to sign in again. */
  sessionExpired: boolean;

  loadSync: (userId: string) => void;

  enqueue: (op: NewSyncOp) => void;

  /** Show an operation's effect in the store (idempotent). */
  applyOp: (op: NewSyncOp) => void;

  /** Undo an operation's optimistic effect after a permanent failure. */
  rollbackOp: (op: NewSyncOp, error: unknown) => void;

  /** Re-read server state at the end of the next sync (after reconnect). */
  requestReconcile: () => void;

  /**
   * Run an operation now when online and nothing is queued ahead of it,
   * otherwise queue it. Resolves with the server result when it ran, or
   * undefined when it was queued (including after a retryable failure).
   * Rejects only for a permanent failure: the caller undoes its optimistic
   * change and reports it.
   */
  runOrQueue: <T = unknown>(op: NewSyncOp) => Promise<T | undefined>;

  saveDraft: (scope: DraftScope, docId: string, content: string) => void;

  /** Forget unsaved content of documents that no longer exist. */
  discardDrafts: (scope: DraftScope, docIds: Iterable<string>) => void;

  flushSync: () => Promise<void>;

  /** Re-read everything from the server (only with an empty outbox). */
  reconcile: () => Promise<void>;

  setSessionExpired: (value: boolean) => void;
}

export const CreateSyncSlice: StateCreator<
  CadenceAppStore,
  [],
  [],
  syncState
> = (set, get) => {
  /* ── persistence ─────────────────────────────────────────────────────── */

  const persist = () => {
    const { syncUserId, outbox, drafts } = get();

    if (!syncUserId) return;

    const ok = writePersistedSync(syncUserId, outbox, drafts);

    if (ok !== !get().syncStorageFailed) return;

    set({ syncStorageFailed: !ok });
  };

  const removeOp = (opId: string) => {
    set((state) => ({ outbox: state.outbox.filter((op) => op.opId !== opId) }));
    persist();
  };

  /* ── retries ─────────────────────────────────────────────────────────── */

  const scheduleRetry = () => {
    if (retryTimer) clearTimeout(retryTimer);

    const delay = Math.min(RETRY_BASE_MS * 2 ** retryAttempt, RETRY_MAX_MS);
    retryAttempt += 1;

    set({ syncRetryAt: Date.now() + delay });

    retryTimer = setTimeout(() => {
      retryTimer = null;
      set({ syncRetryAt: null });
      void get().flushSync();
    }, delay);
  };

  const clearRetry = () => {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    retryAttempt = 0;

    if (get().syncRetryAt !== null) set({ syncRetryAt: null });
  };

  /* ── socket ──────────────────────────────────────────────────────────── */

  const emitWithAck = async <T,>(event: string, payload: unknown) => {
    const socket = get().socket;

    if (!socket || !socket.connected) {
      throw new AckError('NOT_CONNECTED', true);
    }

    let response: AckResponse<T>;

    try {
      response = (await socket
        .timeout(ACK_TIMEOUT_MS)
        .emitWithAck(event, payload)) as AckResponse<T>;
    } catch {
      throw new AckError('ACK_TIMEOUT', true);
    }

    if (!response?.ok) {
      const code = response?.code ?? 'UNKNOWN_ERROR';
      throw new AckError(code, !PERMANENT_ACK_CODES.has(code));
    }

    return response.data;
  };

  /* ── optimistic effects ──────────────────────────────────────────────── */

  /**
   * Show an operation's effect in the store. Idempotent, because pending
   * operations are re-applied on top of fresh server data after a reload
   * or a reconcile.
   */
  const applyOptimistic = (op: SyncOp | NewSyncOp) => {
    const state = get();
    const userId = state.user?.id ?? state.syncUserId ?? '';
    const now = new Date(
      'queuedAt' in op ? op.queuedAt : Date.now(),
    ).toISOString();

    switch (op.type) {
      case 'item.create':
        state.upsertItem(buildOptimisticItem(op, userId, now));
        break;

      case 'item.complete': {
        const item = state.findItem(op.itemId);

        if (!item) break;

        if (item.kind === 'habit') {
          const exists = state.habitCompletions.some(
            (completion) =>
              completion.itemId === op.itemId &&
              completion.occurrenceDate === op.expectedDate,
          );

          if (!exists) {
            state.upsertHabitCompletion({
              id: `${LOCAL_COMPLETION_PREFIX}${op.itemId}:${op.expectedDate}`,
              userId,
              itemId: op.itemId,
              occurrenceDate: op.expectedDate,
              completedAt: now,
            });
          }
        } else if (item.completedAt === null) {
          // Mirrors the database: a normal item's completion date is frozen
          // as the Cadence day it was completed on.
          state.upsertItem(
            item.kind === 'normal'
              ? { ...item, completedAt: now, completedOn: op.expectedDate }
              : { ...item, completedAt: now },
          );
        }
        break;
      }

      case 'folder.create':
        if (!state.folders.some((folder) => folder.id === op.input.id)) {
          state.upsertFolder({
            id: op.input.id,
            userId,
            parentId: op.input.parentId,
            name: op.input.name,
            isRoot: false,
            createdAt: now,
            updatedAt: now,
          });
        }
        break;

      case 'folder.update': {
        const folder = state.folders.find((f) => f.id === op.folderId);

        if (folder) {
          state.upsertFolder({
            ...folder,
            ...(op.input.name !== undefined && { name: op.input.name }),
            ...(op.input.parentId !== undefined && {
              parentId: op.input.parentId,
            }),
          });
        }
        break;
      }

      case 'folder.delete':
        if (state.folders.some((folder) => folder.id === op.folderId)) {
          state.removeFolder(op.folderId);
        }
        break;

      case 'note.create':
        if (!state.notes.some((note) => note.id === op.input.id)) {
          state.upsertNote({
            id: op.input.id,
            userId,
            folderId: op.input.folderId,
            title: op.input.title,
            createdAt: now,
            updatedAt: now,
          });
        }
        break;

      case 'note.update': {
        const note = state.notes.find((n) => n.id === op.noteId);

        if (note) {
          state.upsertNote({
            ...note,
            ...(op.input.title !== undefined && { title: op.input.title }),
            ...(op.input.folderId !== undefined && {
              folderId: op.input.folderId,
            }),
          });
        }
        break;
      }

      case 'note.delete':
        if (state.notes.some((note) => note.id === op.noteId)) {
          state.removeNote(op.noteId);
        }
        break;

      case 'daily.create':
        if (!state.dailyNotes.some((note) => note.noteDate === op.noteDate)) {
          state.upsertDailyNote({
            id: op.localId,
            userId,
            noteDate: op.noteDate,
            content: '',
            createdAt: now,
            updatedAt: now,
          });
        }
        break;
    }
  };

  /* ── executing one operation ─────────────────────────────────────────── */

  const execute = async (op: NewSyncOp): Promise<unknown> => {
    switch (op.type) {
      case 'item.create': {
        const result =
          op.kind === 'normal'
            ? await addNormalItem(op.input)
            : op.kind === 'task'
              ? await addTaskItem(op.input)
              : await addHabitItem(op.input);

        if (result.data) get().upsertItem(result.data);

        return result.data;
      }

      case 'item.complete': {
        get().markItemCompletionPending(op.itemId);

        try {
          const result = await emitWithAck<CompleteResult>('item:complete', {
            itemId: op.itemId,
            expectedDate: op.expectedDate,
          });

          if (result.kind === 'habit') {
            // Replace the optimistic completion with the persisted row.
            get().removeHabitCompletionWhere(
              (completion) =>
                completion.itemId === result.completion.itemId &&
                completion.id.startsWith(LOCAL_COMPLETION_PREFIX),
            );
            get().upsertHabitCompletion(result.completion);
          } else {
            get().upsertItem(result.item);
          }

          return result;
        } finally {
          get().clearItemCompletionPending(op.itemId);
        }
      }

      case 'folder.create': {
        const result = await createFolder(op.input);

        if (result.data) get().upsertFolder(result.data);

        return result.data;
      }

      case 'folder.update': {
        const result = await updateFolder(op.folderId, op.input);

        // Only adopt the server row if nothing newer is queued for it.
        if (result.data && !hasQueued(get().outbox, 'folder', op.folderId)) {
          get().upsertFolder(result.data);
        }

        return result.data;
      }

      case 'folder.delete':
        try {
          await deleteFolder(op.folderId);
        } catch (error) {
          // Already gone (deleted on another device, or a replay): done.
          if (codeOf(error) !== 'FOLDER_NOT_FOUND') throw error;
        }
        return undefined;

      case 'note.create': {
        const result = await createNote(op.input);

        if (result.data && !hasQueued(get().outbox, 'note', op.input.id)) {
          get().upsertNote(toSummary(result.data));
        }

        return result.data ? toSummary(result.data) : undefined;
      }

      case 'note.update': {
        const result = await updateNote(op.noteId, op.input);

        if (result.data && !hasQueued(get().outbox, 'note', op.noteId)) {
          get().upsertNote(result.data);
        }

        return result.data;
      }

      case 'note.delete':
        try {
          await deleteNote(op.noteId);
        } catch (error) {
          if (codeOf(error) !== 'NOTE_NOT_FOUND') throw error;
        }
        return undefined;

      case 'daily.create': {
        const result = await createDailyNote(op.localId);
        const dailyNote = result.data?.dailyNote;

        if (dailyNote) adoptDailyNote(op.localId, dailyNote);

        return dailyNote;
      }
    }
  };

  /**
   * The server may answer daily.create with a note that already existed
   * (created by another tab or device) under a different id. Move the local
   * note, its unsaved text and its draft over to the server's id.
   */
  const adoptDailyNote = (localId: string, serverNote: DailyNote) => {
    if (localId !== serverNote.id) adoptedDailyIds.set(localId, serverNote.id);

    const localKey = draftKey('daily', localId);
    const serverKey = draftKey('daily', serverNote.id);
    const draft = get().drafts[localKey];

    set((state) => {
      const others = state.dailyNotes.filter(
        (note) => note.id !== localId && note.id !== serverNote.id,
      );

      /*
       * Anything typed locally is in the draft. Without one, the server's
       * text wins. With both, the two notes were written independently
       * (neither device saw the other's), so keep both: the server's text
       * first, then this device's, instead of overwriting either.
       */
      const serverText = serverNote.content;
      const localText = draft?.content;

      const content =
        localText === undefined
          ? serverText
          : serverText.trim() &&
              localId !== serverNote.id &&
              !localText.includes(serverText)
            ? `${serverText}\n\n${localText}`
            : localText;

      const merged: DailyNote = { ...serverNote, content };

      const drafts = { ...state.drafts };

      if (draft && localId !== serverNote.id) {
        delete drafts[localKey];
        drafts[serverKey] = {
          ...draft,
          docId: serverNote.id,
          content,
          rev: draft.rev + 1,
          updatedAt: Date.now(),
        };
      }

      return {
        dailyNotes: [...others, merged].sort(
          (a, b) =>
            b.noteDate.localeCompare(a.noteDate) ||
            b.updatedAt.localeCompare(a.updatedAt),
        ),
        drafts,
      };
    });

    persist();
  };

  /* ── permanent failures ──────────────────────────────────────────────── */

  const rollback = (op: NewSyncOp, error: unknown) => {
    const code = codeOf(error);
    const state = get();

    switch (op.type) {
      case 'item.create':
        state.removeItem(op.input.id);
        toast.error(createFailureMessage(op.input.title, code));
        break;

      case 'item.complete': {
        const item = state.findItem(op.itemId);

        if (item?.kind === 'habit') {
          state.removeHabitCompletionWhere(
            (completion) =>
              completion.itemId === op.itemId &&
              completion.occurrenceDate === op.expectedDate &&
              completion.id.startsWith(LOCAL_COMPLETION_PREFIX),
          );
        } else if (item) {
          state.upsertItem(
            item.kind === 'normal'
              ? { ...item, completedAt: null, completedOn: null }
              : { ...item, completedAt: null },
          );
        }

        toast.error(completionFailureMessage(item?.title ?? 'This item', code));
        break;
      }

      case 'folder.create':
      case 'folder.update':
      case 'folder.delete':
      case 'note.create':
      case 'note.update':
      case 'note.delete': {
        const action = {
          'folder.create': 'A new folder',
          'folder.update': 'A folder change',
          'folder.delete': 'A folder deletion',
          'note.create': 'A new note',
          'note.update': 'A note change',
          'note.delete': 'A note deletion',
        }[op.type];

        toast.error(treeFailureMessage(action, code));
        reconcileNeeded = true;
        break;
      }

      case 'daily.create':
        toast.error('Today’s daily note couldn’t be created on the server.');
        reconcileNeeded = true;
        break;
    }
  };

  /* ── drafts ──────────────────────────────────────────────────────────── */

  const nextSendableDraft = () => {
    const { drafts, draftsInFlight, draftErrors, notes, dailyNotes, outbox } =
      get();

    return Object.entries(drafts).find(([key, draft]) => {
      if (draftsInFlight[key] !== undefined) return false;
      if (draftErrors[key]) return false;

      // The document must exist on the server: its create has synced.
      const createPending = outbox.some((op) =>
        draft.scope === 'note'
          ? op.type === 'note.create' && op.input.id === draft.docId
          : op.type === 'daily.create' && op.localId === draft.docId,
      );

      if (createPending) return false;

      return draft.scope === 'note'
        ? notes.some((note) => note.id === draft.docId)
        : dailyNotes.some((note) => note.id === draft.docId);
    });
  };

  const sendDraft = async (key: string, draft: Draft) => {
    set((state) => ({
      draftsInFlight: { ...state.draftsInFlight, [key]: draft.rev },
    }));

    try {
      const event = draft.scope === 'note' ? 'note:update' : 'daily-note:update';

      await emitWithAck<NoteSaveAck | DailyNoteSaveAck>(event, {
        noteId: draft.docId,
        content: draft.content,
        saveId: ++saveCounter,
      });

      // Confirmed. Remove the draft only if nothing newer was typed since.
      set((state) => {
        const current = state.drafts[key];
        const drafts = { ...state.drafts };

        if (current && current.rev === draft.rev) delete drafts[key];

        return { drafts };
      });
      persist();
    } catch (error) {
      if (isRetryable(error)) throw error;

      handleDraftRejected(key, draft, codeOf(error));
    } finally {
      set((state) => {
        const draftsInFlight = { ...state.draftsInFlight };
        delete draftsInFlight[key];
        return { draftsInFlight };
      });
    }
  };

  const dropDraft = (key: string) => {
    set((state) => {
      const drafts = { ...state.drafts };
      delete drafts[key];
      return { drafts };
    });
    persist();
  };

  /**
   * Keep the words of a note that was deleted on another device while it
   * was being edited here: they become a new note in the top folder.
   */
  const recoverAsNewNote = (draft: Draft, title: string | undefined) => {
    const rootId = get().folders.find((folder) => folder.isRoot)?.id;

    if (!rootId || !draft.content.trim()) return;

    const op: NewSyncOp = {
      type: 'note.create',
      input: {
        id: newId(),
        folderId: rootId,
        title: `${title ?? 'Untitled'} (recovered)`.slice(0, 200),
        content: draft.content,
      },
    };

    applyOptimistic(op);
    get().enqueue(op);
    toast.warning(
      `“${title ?? 'A note'}” was deleted elsewhere. Your latest text was kept as a new note.`,
    );
  };

  const handleDraftRejected = (key: string, draft: Draft, code?: string) => {
    if (code === 'NOTE_NOT_FOUND' || code === 'DAILY_NOTE_NOT_FOUND') {
      const local = get().notes.find((note) => note.id === draft.docId);

      dropDraft(key);

      // Still here locally means it was deleted somewhere else; a note the
      // user deleted here is gone locally too, and there is nothing to keep.
      if (code === 'NOTE_NOT_FOUND' && local) {
        recoverAsNewNote(draft, local.title);
      }

      return;
    }

    // Too large or otherwise invalid: keep the text, stop resending it.
    set((state) => ({
      draftErrors: { ...state.draftErrors, [key]: code ?? 'REJECTED' },
    }));
  };

  /* ── reconcile helpers ───────────────────────────────────────────────── */

  /**
   * Drafts whose document no longer exists on the server (deleted on
   * another device while this one was offline). A note's words are kept as
   * a new note. Only decided from a list that actually loaded; otherwise
   * the draft waits for a later reconcile.
   */
  const sweepOrphanDrafts = () => {
    const { drafts, outbox } = get();

    for (const [key, draft] of Object.entries(drafts)) {
      const state = get();

      const listLoaded =
        draft.scope === 'daily'
          ? state.dailyNotesStatus === 'ready'
          : state.notesStatus === 'ready';

      if (!listLoaded) continue;

      const exists =
        draft.scope === 'daily'
          ? state.dailyNotes.some((note) => note.id === draft.docId)
          : state.notes.some((note) => note.id === draft.docId);

      const createPending = outbox.some((op) =>
        draft.scope === 'note'
          ? op.type === 'note.create' && op.input.id === draft.docId
          : op.type === 'daily.create' && op.localId === draft.docId,
      );

      if (exists || createPending) continue;

      dropDraft(key);

      if (draft.scope === 'note') recoverAsNewNote(draft, undefined);
    }
  };

  const reapplyPending = () => {
    for (const op of get().outbox) applyOptimistic(op);
  };

  return {
    syncUserId: null,
    outbox: [],
    drafts: {},
    draftsInFlight: {},
    draftErrors: {},
    isSyncing: false,
    syncRetryAt: null,
    syncStorageFailed: false,
    sessionExpired: false,

    loadSync: (userId) => {
      if (get().syncUserId === userId) return;

      const persisted = readPersistedSync(userId);

      set({
        syncUserId: userId,
        outbox: persisted.outbox,
        drafts: persisted.drafts,
        draftsInFlight: {},
        draftErrors: {},
      });

      // Show what is still waiting to sync on top of the server data.
      reapplyPending();

      for (const draft of Object.values(persisted.drafts)) {
        if (draft.scope === 'daily') {
          get().setDailyNoteContent(draft.docId, draft.content);
        } else {
          get().setNoteContent(draft.docId, draft.content);
        }
      }

      sweepOrphanDrafts();

      void get().flushSync();
    },

    enqueue: (newOp) => {
      const op = {
        ...newOp,
        opId: newId(),
        queuedAt: Date.now(),
      } as SyncOp;

      set((state) => ({ outbox: [...state.outbox, op] }));
      persist();

      void get().flushSync();
    },

    applyOp: (op) => applyOptimistic(op),

    rollbackOp: (op, error) => rollback(op, error),

    requestReconcile: () => {
      reconcileNeeded = true;
      void get().flushSync();
    },

    runOrQueue: async <T,>(op: NewSyncOp) => {
      const { isSocketConnected, outbox } = get();

      // Order matters: never overtake operations that are already queued.
      if (!isSocketConnected || outbox.length > 0) {
        get().enqueue(op);
        return undefined;
      }

      return withOpLock(async () => {
        // Something may have been queued while we waited for our turn.
        if (!get().isSocketConnected || get().outbox.length > 0) {
          get().enqueue(op);
          return undefined;
        }

        try {
          return (await execute(op)) as T;
        } catch (error) {
          if (isRetryable(error)) {
            get().enqueue(op);
            return undefined;
          }

          throw error;
        }
      });
    },

    saveDraft: (scope, requestedId, content) => {
      // A local Daily Note may have been merged into the server's meanwhile.
      const docId =
        scope === 'daily'
          ? (adoptedDailyIds.get(requestedId) ?? requestedId)
          : requestedId;

      // The document was deleted (e.g. its tab closing after a delete
      // commits the last keystrokes): there is nothing to save it to.
      const exists =
        scope === 'daily'
          ? get().dailyNotes.some((note) => note.id === docId)
          : get().notes.some((note) => note.id === docId);

      if (!exists) return;

      const key = draftKey(scope, docId);

      set((state) => {
        const previous = state.drafts[key];
        const draftErrors = { ...state.draftErrors };

        // New text may fix whatever made the server reject the old one.
        delete draftErrors[key];

        return {
          drafts: {
            ...state.drafts,
            [key]: {
              scope,
              docId,
              content,
              rev: (previous?.rev ?? 0) + 1,
              updatedAt: Date.now(),
            },
          },
          draftErrors,
        };
      });
      persist();

      void get().flushSync();
    },

    discardDrafts: (scope, docIds) => {
      set((state) => {
        const drafts = { ...state.drafts };

        for (const id of docIds) delete drafts[draftKey(scope, id)];

        return { drafts };
      });
      persist();
    },

    flushSync: async () => {
      if (flushing) {
        flushAgain = true;
        return;
      }

      if (!get().isSocketConnected || !get().syncUserId) return;

      flushing = true;
      set({ isSyncing: true });

      let failed = false;

      try {
        // 1. Operations, strictly in order.
        while (get().outbox.length > 0 && get().isSocketConnected) {
          const op = get().outbox[0]!;

          try {
            await withOpLock(() => execute(op));
            removeOp(op.opId);
          } catch (error) {
            if (isRetryable(error)) {
              if (error instanceof ApiError && error.status === 401) {
                get().setSessionExpired(true);
              }

              failed = true;
              break;
            }

            removeOp(op.opId);
            rollback(op, error);
          }
        }

        // 2. Content, once every create it may depend on has synced.
        if (!failed && get().outbox.length === 0) {
          for (
            let next = nextSendableDraft();
            next && get().isSocketConnected && get().outbox.length === 0;
            next = nextSendableDraft()
          ) {
            try {
              await sendDraft(next[0], next[1]);
              } catch {
              failed = true;
              break;
            }
          }
        }
      } finally {
        flushing = false;
        set({ isSyncing: false });
      }

      if (failed) {
        scheduleRetry();
        return;
      }

      clearRetry();

      if (flushAgain) {
        flushAgain = false;
        void get().flushSync();
        return;
      }

      if (reconcileNeeded) {
        reconcileNeeded = false;
        void get().reconcile();
      }
    },

    reconcile: async () => {
      if (!get().isSocketConnected || get().outbox.length > 0) {
        reconcileNeeded = true;
        return;
      }

      const [items, completions, folders, notes, dailyNotes] =
        await Promise.allSettled([
          getItems(),
          getHabitCompletions(),
          getFolders(),
          getNotes(),
          getDailyNotes(),
        ]);

      const state = get();

      if (items.status === 'fulfilled' && items.value.data) {
        state.replaceItems(items.value.data);
        set({ itemsStatus: 'ready', itemsError: null });
      }

      if (completions.status === 'fulfilled' && completions.value.data) {
        state.replaceHabitCompletions(completions.value.data);
        set({ habitCompletionsStatus: 'ready', habitCompletionsError: null });
      }

      if (
        folders.status === 'fulfilled' &&
        notes.status === 'fulfilled' &&
        folders.value.data &&
        notes.value.data
      ) {
        state.replaceNotesTree(folders.value.data, notes.value.data);
        set({ notesStatus: 'ready', notesError: null });
      }

      if (dailyNotes.status === 'fulfilled' && dailyNotes.value.data) {
        const drafts = get().drafts;

        state.replaceDailyNotes(
          dailyNotes.value.data.dailyNotes.map((note) => {
            const draft = drafts[draftKey('daily', note.id)];
            return draft ? { ...note, content: draft.content } : note;
          }),
        );
        set({ dailyNotesStatus: 'ready', dailyNotesError: null });

        // The day may have rolled over while we were offline.
        const now = new Date();
        const user = get().user;

        if (!needsOnboarding(user)) {
          get().ensureTodayDailyNote(getCadenceDate(now, daySettingsFor(user, now)));
        }
      }

      // Anything queued while we were fetching stays visible.
      reapplyPending();
      sweepOrphanDrafts();
    },

    setSessionExpired: (value) => {
      if (get().sessionExpired !== value) set({ sessionExpired: value });
    },
  };
};

/* ── pure helpers ──────────────────────────────────────────────────────── */

function hasQueued(outbox: SyncOp[], kind: 'folder' | 'note', id: string) {
  return outbox.some((op) =>
    kind === 'folder'
      ? (op.type === 'folder.update' || op.type === 'folder.delete') &&
        op.folderId === id
      : (op.type === 'note.update' || op.type === 'note.delete') &&
        op.noteId === id,
  );
}

function toSummary(note: Note | NoteSummary): NoteSummary {
  return {
    id: note.id,
    userId: note.userId,
    folderId: note.folderId,
    title: note.title,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

function buildOptimisticItem(
  op: Extract<NewSyncOp, { type: 'item.create' }>,
  userId: string,
  now: string,
): Item {
  const base = {
    id: op.input.id,
    userId,
    title: op.input.title,
    description: op.input.description ?? null,
    createdAt: now,
    updatedAt: now,
  };

  switch (op.kind) {
    case 'normal':
      return {
        ...base,
        kind: 'normal',
        scheduledDate: null,
        scheduledTime: null,
        recurrenceKind: null,
        recurrenceDays: null,
        recurrenceStartDate: null,
        recurrenceEndDate: null,
        completedAt: null,
        completedOn: null,
      };

    case 'task':
      return {
        ...base,
        kind: 'task',
        scheduledDate: op.input.scheduledDate,
        scheduledTime: op.input.scheduledTime ?? null,
        recurrenceKind: null,
        recurrenceDays: null,
        recurrenceStartDate: null,
        recurrenceEndDate: null,
        completedAt: null,
        completedOn: null,
      };

    case 'habit':
      return {
        ...base,
        kind: 'habit',
        scheduledDate: null,
        scheduledTime: op.input.scheduledTime ?? null,
        recurrenceKind: op.input.recurrence.kind,
        recurrenceDays: op.input.recurrence.days,
        recurrenceStartDate: op.input.recurrence.startDate,
        recurrenceEndDate: op.input.recurrence.endDate,
        completedAt: null,
        completedOn: null,
      };
  }
}
