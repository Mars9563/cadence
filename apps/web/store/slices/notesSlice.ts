import { StateCreator } from 'zustand';
import type { Folder, NoteSummary } from '@cadence/types';
import type {
  CreateFolderInput,
  CreateNoteInput,
  UpdateFolderInput,
} from '@cadence/validation';

import { getFolders } from '@/api/getFolders';
import { getNotes } from '@/api/getNotes';
import type { UpdateNoteDetailsInput } from '@/api/updateNote';
import { toUserMessage } from '@/lib/errors';
import type { NewSyncOp } from '@/lib/sync/types';
import { newId } from '@/lib/uuid';

import type { CadenceAppStore } from '../types';

export type NotesStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface notesState {
  /**
   * Flat lists, exactly as the server returns them.
   *
   * The folder/note tree is NOT stored: it is derived from these two
   * arrays (folder.parentId and note.folderId) whenever it is rendered.
   * Moving something is therefore just changing one id.
   */
  folders: Folder[];
  notes: NoteSummary[];

  notesStatus: NotesStatus;
  notesError: string | null;

  /**
   * Load every folder and every note summary for the current user.
   */
  fetchNotesTree: () => Promise<void>;

  /*
   * Every tree change is OPTIMISTIC and goes through the sync engine:
   * local state changes first so the tree reacts instantly, then the change
   * is sent (online) or queued (offline). Creates use a client id, so a
   * folder or note made offline can be renamed, moved, filled or used as a
   * parent right away. If the server refuses, the change is undone and the
   * promise rejects so the caller can report it.
   */
  createFolder: (input: Omit<CreateFolderInput, 'id'>) => Promise<Folder>;
  createNote: (input: Omit<CreateNoteInput, 'id'>) => Promise<NoteSummary>;

  updateFolder: (folderId: string, input: UpdateFolderInput) => Promise<void>;
  updateNote: (noteId: string, input: UpdateNoteDetailsInput) => Promise<void>;

  /** Deleting a folder also removes its whole subtree. */
  deleteFolder: (folderId: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;

  /** Replace folders and notes with server data (reconcile). */
  replaceNotesTree: (folders: Folder[], notes: NoteSummary[]) => void;

  /**
   * Insert or replace a folder (create, rename, move).
   */
  upsertFolder: (folder: Folder) => void;

  /**
   * Remove a folder AND everything beneath it.
   *
   * The database deletes descendants with ON DELETE CASCADE but only
   * returns the deleted folder's id, so local state has to work out the
   * rest of the subtree itself.
   */
  removeFolder: (folderId: string) => void;

  /**
   * Insert or replace a note summary (create, rename, move).
   */
  upsertNote: (note: NoteSummary) => void;

  removeNote: (noteId: string) => void;

  /**
   * Reset notes state on sign-out/user change.
   */
  resetNotes: () => void;
}

const initialNotesState = {
  folders: [] as Folder[],
  notes: [] as NoteSummary[],

  notesStatus: 'idle' as NotesStatus,
  notesError: null as string | null,
};

/**
 * Ids of `folderId` and every folder nested beneath it, at any depth.
 *
 * 1. Index the flat list once: parentId -> child ids.
 * 2. Walk down from `folderId` with a stack, collecting each folder's
 *    children until there is nothing left to visit.
 */
function collectFolderSubtreeIds(
  folders: Folder[],
  folderId: string,
): Set<string> {
  const childIdsByParentId = new Map<string, string[]>();

  for (const folder of folders) {
    if (folder.parentId === null) continue;

    const siblings = childIdsByParentId.get(folder.parentId);

    if (siblings) {
      siblings.push(folder.id);
    } else {
      childIdsByParentId.set(folder.parentId, [folder.id]);
    }
  }

  const subtreeIds = new Set<string>();
  const toVisit = [folderId];

  while (toVisit.length > 0) {
    const id = toVisit.pop()!;

    if (subtreeIds.has(id)) continue;

    subtreeIds.add(id);
    toVisit.push(...(childIdsByParentId.get(id) ?? []));
  }

  return subtreeIds;
}

export const CreateNotesSlice: StateCreator<
  CadenceAppStore,
  [],
  [],
  notesState
> = (set, get) => ({
  ...initialNotesState,

  fetchNotesTree: async () => {
    if (get().notesStatus === 'loading') {
      return;
    }

    set({
      notesStatus: 'loading',
      notesError: null,
    });

    try {
      /*
       * Both halves are needed before the tree means anything: notes
       * without folders have nowhere to go, and folders without notes
       * look empty. Load them together and commit them together.
       */
      const [foldersResult, notesResult] = await Promise.all([
        getFolders(),
        getNotes(),
      ]);

      if (!foldersResult.data || !notesResult.data) {
        throw new Error('Failed to fetch notes');
      }

      set({
        folders: foldersResult.data,
        notes: notesResult.data,
        notesStatus: 'ready',
        notesError: null,
      });
    } catch (error) {
      set({
        notesStatus: 'error',
        notesError: toUserMessage(
          error,
          'Something went wrong while loading your notes.',
        ),
      });
    }
  },

  createFolder: async (input) => {
    const op: NewSyncOp = {
      type: 'folder.create',
      input: { ...input, id: newId() },
    };

    get().applyOp(op);

    try {
      await get().runOrQueue(op);
    } catch (error) {
      get().removeFolder(op.input.id);
      throw error;
    }

    return get().folders.find((folder) => folder.id === op.input.id)!;
  },

  createNote: async (input) => {
    const op: NewSyncOp = {
      type: 'note.create',
      input: { ...input, id: newId() },
    };

    get().applyOp(op);

    try {
      await get().runOrQueue(op);
    } catch (error) {
      get().removeNote(op.input.id);
      throw error;
    }

    return get().notes.find((note) => note.id === op.input.id)!;
  },

  updateFolder: async (folderId, input) => {
    const previous = get().folders.find((folder) => folder.id === folderId);

    if (!previous) {
      throw new Error('FOLDER_NOT_FOUND');
    }

    const op: NewSyncOp = { type: 'folder.update', folderId, input };

    get().applyOp(op);

    try {
      await get().runOrQueue(op);
    } catch (error) {
      get().upsertFolder(previous);
      throw error;
    }
  },

  updateNote: async (noteId, input) => {
    const previous = get().notes.find((note) => note.id === noteId);

    if (!previous) {
      throw new Error('NOTE_NOT_FOUND');
    }

    const op: NewSyncOp = { type: 'note.update', noteId, input };

    get().applyOp(op);

    try {
      await get().runOrQueue(op);
    } catch (error) {
      get().upsertNote(previous);
      throw error;
    }
  },

  deleteFolder: async (folderId) => {
    const { folders, notes } = get();

    // Snapshot for undo, and the notes whose unsaved text goes with them.
    const subtree = collectFolderSubtreeIds(folders, folderId);
    const removedFolders = folders.filter((folder) => subtree.has(folder.id));
    const removedNotes = notes.filter((note) => subtree.has(note.folderId));

    const op: NewSyncOp = { type: 'folder.delete', folderId };

    get().applyOp(op);
    get().discardDrafts(
      'note',
      removedNotes.map((note) => note.id),
    );

    try {
      await get().runOrQueue(op);
    } catch (error) {
      for (const folder of removedFolders) get().upsertFolder(folder);
      for (const note of removedNotes) get().upsertNote(note);
      throw error;
    }
  },

  deleteNote: async (noteId) => {
    const previous = get().notes.find((note) => note.id === noteId);
    const op: NewSyncOp = { type: 'note.delete', noteId };

    get().applyOp(op);
    get().discardDrafts('note', [noteId]);

    try {
      await get().runOrQueue(op);
    } catch (error) {
      if (previous) get().upsertNote(previous);
      throw error;
    }
  },

  replaceNotesTree: (folders, notes) => {
    const noteIds = new Set(notes.map((note) => note.id));
    const missing = new Set(
      get()
        .notes.map((note) => note.id)
        .filter((id) => !noteIds.has(id)),
    );

    set({ folders, notes });

    // Notes deleted elsewhere: close their tabs, forget their cache.
    if (missing.size > 0) get().closeNoteTabsFor(missing);

    // Cached content of notes that are not open may be stale now; drop it
    // so the next open fetches the server version. Open editors and unsaved
    // drafts keep theirs.
    get().pruneNoteContents();
  },

  upsertFolder: (folder) => {
    set((state) => {
      const exists = state.folders.some((existing) => existing.id === folder.id);

      return {
        folders: exists
          ? state.folders.map((existing) =>
              existing.id === folder.id ? folder : existing,
            )
          : [...state.folders, folder],
      };
    });
  },

  removeFolder: (folderId) => {
    const { folders, notes } = get();

    const removedIds = collectFolderSubtreeIds(folders, folderId);

    const removedNoteIds = new Set(
      notes
        .filter((note) => removedIds.has(note.folderId))
        .map((note) => note.id),
    );

    set({
      folders: folders.filter((folder) => !removedIds.has(folder.id)),
      notes: notes.filter((note) => !removedNoteIds.has(note.id)),
    });

    // Open tabs for notes that no longer exist are closed.
    get().closeNoteTabsFor(removedNoteIds);
  },

  upsertNote: (note) => {
    set((state) => {
      const exists = state.notes.some((existing) => existing.id === note.id);

      return {
        notes: exists
          ? state.notes.map((existing) =>
              existing.id === note.id ? note : existing,
            )
          : [...state.notes, note],
      };
    });
  },

  removeNote: (noteId) => {
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== noteId),
    }));

    get().closeNoteTabsFor(new Set([noteId]));
  },

  resetNotes: () => {
    set({
      ...initialNotesState,
    });
  },
});
