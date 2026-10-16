import { StateCreator } from 'zustand';
import type { Folder, NoteSummary } from '@cadence/types';
import type {
  CreateFolderInput,
  CreateNoteInput,
  UpdateFolderInput,
} from '@cadence/validation';

import { createFolder as requestCreateFolder } from '@/api/createFolder';
import { createNote as requestCreateNote } from '@/api/createNote';
import { deleteFolder as requestDeleteFolder } from '@/api/deleteFolder';
import { deleteNote as requestDeleteNote } from '@/api/deleteNote';
import { getFolders } from '@/api/getFolders';
import { getNotes } from '@/api/getNotes';
import { updateFolder as requestUpdateFolder } from '@/api/updateFolder';
import {
  updateNote as requestUpdateNote,
  type UpdateNoteDetailsInput,
} from '@/api/updateNote';
import { toUserMessage } from '@/lib/errors';

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

  /**
   * Create on the server, then insert into local state.
   * Throws on failure so the caller can report it.
   */
  createFolder: (input: CreateFolderInput) => Promise<Folder>;
  createNote: (input: CreateNoteInput) => Promise<NoteSummary>;

  /**
   * Rename and/or move, OPTIMISTICALLY: local state changes first so the
   * tree reacts instantly, then the server is asked. If the server
   * refuses, the previous version is restored and the error is rethrown.
   */
  updateFolder: (folderId: string, input: UpdateFolderInput) => Promise<void>;
  updateNote: (noteId: string, input: UpdateNoteDetailsInput) => Promise<void>;

  /**
   * Delete on the server FIRST, then remove locally (not optimistic:
   * a delete that silently comes back would be more confusing than a
   * short wait). Deleting a folder also removes its whole subtree.
   */
  deleteFolder: (folderId: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;

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
    const folder = (await requestCreateFolder(input)).data;

    if (!folder) {
      throw new Error('Failed to create folder');
    }

    get().upsertFolder(folder);

    return folder;
  },

  createNote: async (input) => {
    const note = (await requestCreateNote(input)).data;

    if (!note) {
      throw new Error('Failed to create note');
    }

    // The store holds summaries only; content belongs to the editor.
    const summary: NoteSummary = {
      id: note.id,
      userId: note.userId,
      folderId: note.folderId,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };

    get().upsertNote(summary);

    return summary;
  },

  updateFolder: async (folderId, input) => {
    const previous = get().folders.find((folder) => folder.id === folderId);

    if (!previous) {
      throw new Error('FOLDER_NOT_FOUND');
    }

    get().upsertFolder({
      ...previous,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.parentId !== undefined && { parentId: input.parentId }),
    });

    try {
      const folder = (await requestUpdateFolder(folderId, input)).data;

      if (!folder) {
        throw new Error('Failed to update folder');
      }

      get().upsertFolder(folder);
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

    get().upsertNote({
      ...previous,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.folderId !== undefined && { folderId: input.folderId }),
    });

    try {
      const note = (await requestUpdateNote(noteId, input)).data;

      if (!note) {
        throw new Error('Failed to update note');
      }

      get().upsertNote(note);
    } catch (error) {
      get().upsertNote(previous);

      throw error;
    }
  },

  deleteFolder: async (folderId) => {
    await requestDeleteFolder(folderId);

    get().removeFolder(folderId);
  },

  deleteNote: async (noteId) => {
    await requestDeleteNote(noteId);

    get().removeNote(noteId);
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
