import { StateCreator } from 'zustand';
import type { DailyNote } from '@cadence/types';

import { createDailyNote } from '@/api/createDailyNote';
import { getDailyNotes } from '@/api/getDailyNotes';
import { toUserMessage } from '@/lib/errors';

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
   * `noteDate` must be the current Cadence date calculated
   * by the bootstrap layer.
   *
   * If today's note already exists, nothing is created.
   *
   * If it does not exist, creation happens through HTTP.
   */
  ensureTodayDailyNote: (noteDate: string) => Promise<void>;

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

export const CreateDailyNoteSlice: StateCreator<dailyNoteState> = (
  set,
  get,
) => ({
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

  ensureTodayDailyNote: async (noteDate) => {
    /*
     * This method should only run after the initial daily-note
     * fetch has completed.
     *
     * If bootstrap somehow calls it before the fetch has populated
     * the slice, we still avoid creating blindly.
     */
    const existingNote = get().dailyNotes.find(
      (note) => note.noteDate === noteDate,
    );

    if (existingNote) {
      return;
    }

    try {
      const result = await createDailyNote();

      const dailyNote = result.data?.dailyNote;

      if (!dailyNote) {
        throw new Error('Failed to create daily note');
      }

      get().upsertDailyNote(dailyNote);
    } catch (error) {
      set({
        dailyNotesStatus: 'error',
        dailyNotesError: toUserMessage(
          error,
          'Something went wrong while creating today’s daily note.',
        ),
      });
    }
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
