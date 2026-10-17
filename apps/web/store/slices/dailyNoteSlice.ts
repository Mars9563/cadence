import { StateCreator } from 'zustand';
import type { DailyNote } from '@cadence/types';

import { getDailyNotes } from '@/api/getDailyNotes';
import { toUserMessage } from '@/lib/errors';
import { newId } from '@/lib/uuid';

import type { CadenceAppStore } from '../types';

export type DailyNotesStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface dailyNoteState {
  dailyNotes: DailyNote[];

  dailyNotesStatus: DailyNotesStatus;
  dailyNotesError: string | null;

  /**
   * Load all daily notes belonging to the current user.
   */
  fetchDailyNotes: () => Promise<void>;

  /**
   * Make sure today's Cadence daily note exists.
   *
   * `noteDate` is the current Cadence date (bootstrap, and again whenever
   * the day rolls over). If there is no note for it yet, one is created
   * locally straight away, so the user can write even offline, and the
   * create is synced. The server decides the real date and returns the
   * existing note if another device made it first; the local note then
   * moves to that id (see syncSlice adoptDailyNote).
   */
  ensureTodayDailyNote: (noteDate: string) => void;

  /** Replace the list with server data (reconcile). */
  replaceDailyNotes: (dailyNotes: DailyNote[]) => void;

  /**
   * Insert or replace a daily note in local state.
   */
  upsertDailyNote: (dailyNote: DailyNote) => void;

  /**
   * Update only the local Markdown content.
   *
   * The socket layer is responsible for sending the persisted
   * update to the backend.
   */
  setDailyNoteContent: (noteId: string, content: string) => void;

  /**
   * Reset daily-note state on sign-out/user change.
   */
  resetDailyNotes: () => void;
}

const initialDailyNoteState = {
  dailyNotes: [] as DailyNote[],

  dailyNotesStatus: 'idle' as DailyNotesStatus,

  dailyNotesError: null as string | null,
};

function sortDailyNotes(notes: DailyNote[]): DailyNote[] {
  return [...notes].sort(
    (a, b) =>
      b.noteDate.localeCompare(a.noteDate) ||
      b.updatedAt.localeCompare(a.updatedAt),
  );
}

export const CreateDailyNoteSlice: StateCreator<
  CadenceAppStore,
  [],
  [],
  dailyNoteState
> = (set, get) => ({
  ...initialDailyNoteState,

  fetchDailyNotes: async () => {
    if (get().dailyNotesStatus === 'loading') {
      return;
    }

    set({
      dailyNotesStatus: 'loading',
      dailyNotesError: null,
    });

    try {
      const result = await getDailyNotes();

      const data = result.data;

      if (!data) {
        throw new Error('Failed to fetch daily notes');
      }

      set({
        dailyNotes: sortDailyNotes(data.dailyNotes),
        dailyNotesStatus: 'ready',
        dailyNotesError: null,
      });
    } catch (error) {
      set({
        dailyNotesStatus: 'error',
        dailyNotesError: toUserMessage(
          error,
          'Something went wrong while loading your daily notes.',
        ),
      });
    }
  },

  ensureTodayDailyNote: (noteDate) => {
    if (get().dailyNotes.some((note) => note.noteDate === noteDate)) {
      return;
    }

    // Never queue a second create for the same day.
    const alreadyQueued = get().outbox.some(
      (op) => op.type === 'daily.create' && op.noteDate === noteDate,
    );

    if (alreadyQueued) return;

    const op = {
      type: 'daily.create' as const,
      localId: newId(),
      noteDate,
    };

    get().applyOp(op);
    void get()
      .runOrQueue(op)
      .catch((error) => get().rollbackOp(op, error));
  },

  replaceDailyNotes: (dailyNotes) => {
    set({ dailyNotes: sortDailyNotes(dailyNotes) });
  },

  upsertDailyNote: (dailyNote) => {
    set((state) => {
      const existingIndex = state.dailyNotes.findIndex(
        (existing) => existing.id === dailyNote.id,
      );

      if (existingIndex === -1) {
        return {
          dailyNotes: sortDailyNotes([...state.dailyNotes, dailyNote]),
        };
      }

      const next = [...state.dailyNotes];

      next[existingIndex] = dailyNote;

      return {
        dailyNotes: sortDailyNotes(next),
      };
    });
  },

  setDailyNoteContent: (noteId, content) => {
    set((state) => ({
      dailyNotes: state.dailyNotes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              content,
            }
          : note,
      ),
    }));
  },

  resetDailyNotes: () => {
    set({
      ...initialDailyNoteState,
    });
  },
});
