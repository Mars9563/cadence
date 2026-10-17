import type {
  CreateFolderInput,
  CreateHabitItemInput,
  CreateNormalItemInput,
  CreateNoteInput,
  CreateTaskItemInput,
  UpdateFolderInput,
} from '@cadence/validation';

import type { UpdateNoteDetailsInput } from '@/api/updateNote';

/*
 * ===========================================================================
 * Sync model
 * ===========================================================================
 *
 * Every write the user makes is applied to the store immediately
 * (optimistically) and described by one of two durable records:
 *
 *   SyncOp  — a discrete operation (create, rename, move, delete, complete).
 *             Kept in a FIFO outbox and replayed in order, because later
 *             operations can depend on earlier ones (a note created inside a
 *             folder that was itself created offline).
 *
 *   Draft   — the latest unsaved content of one document (a note or a Daily
 *             Note). Content is "last write wins", so only the newest text is
 *             kept per document, never a history of keystrokes.
 *
 * Both are persisted per user in localStorage, so closing the tab, reloading
 * or losing the connection never loses work; they are removed once the
 * server has confirmed them. See docs/sync-and-reliability.md.
 *
 * Creates carry a client-generated id. Replaying a create is idempotent on
 * the server, so an operation whose response was lost can simply be sent
 * again.
 */

type OpBase = {
  /** Unique id of this queued operation (not of the row it touches). */
  opId: string;

  /** When the user made the change (ms since epoch). */
  queuedAt: number;
};

export type ItemCreateOp = OpBase &
  (
    | { type: 'item.create'; kind: 'normal'; input: CreateNormalItemInput & { id: string } }
    | { type: 'item.create'; kind: 'task'; input: CreateTaskItemInput & { id: string } }
    | { type: 'item.create'; kind: 'habit'; input: CreateHabitItemInput & { id: string } }
  );

export type ItemCompleteOp = OpBase & {
  type: 'item.complete';
  itemId: string;

  /** The Cadence date the user saw; the server rejects a late delivery. */
  expectedDate: string;
};

export type FolderCreateOp = OpBase & {
  type: 'folder.create';
  input: CreateFolderInput & { id: string };
};

export type FolderUpdateOp = OpBase & {
  type: 'folder.update';
  folderId: string;
  input: UpdateFolderInput;
};

export type FolderDeleteOp = OpBase & {
  type: 'folder.delete';
  folderId: string;
};

export type NoteCreateOp = OpBase & {
  type: 'note.create';
  input: CreateNoteInput & { id: string };
};

export type NoteUpdateOp = OpBase & {
  type: 'note.update';
  noteId: string;
  input: UpdateNoteDetailsInput;
};

export type NoteDeleteOp = OpBase & {
  type: 'note.delete';
  noteId: string;
};

/** Today's Daily Note, created locally (offline, or at day rollover). */
export type DailyNoteCreateOp = OpBase & {
  type: 'daily.create';
  localId: string;
  noteDate: string;
};

export type SyncOp =
  | ItemCreateOp
  | ItemCompleteOp
  | FolderCreateOp
  | FolderUpdateOp
  | FolderDeleteOp
  | NoteCreateOp
  | NoteUpdateOp
  | NoteDeleteOp
  | DailyNoteCreateOp;

/** Distributive Omit, so each member of the union keeps its own fields. */
export type NewSyncOp = SyncOp extends infer T
  ? T extends SyncOp
    ? Omit<T, 'opId' | 'queuedAt'>
    : never
  : never;

export type DraftScope = 'note' | 'daily';

export type Draft = {
  scope: DraftScope;
  docId: string;
  content: string;

  /** Increases on every local change; a save confirms one revision. */
  rev: number;

  updatedAt: number;
};

export const draftKey = (scope: DraftScope, docId: string) =>
  `${scope}:${docId}`;

/** What persists across reloads, per user. */
export type PersistedSync = {
  version: 1;
  outbox: SyncOp[];
  drafts: Record<string, Draft>;
};
