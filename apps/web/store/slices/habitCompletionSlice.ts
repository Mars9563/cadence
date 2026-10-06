import { StateCreator } from 'zustand';
import type { HabitCompletion } from '@cadence/types';

import { getHabitCompletions } from '@/api/getHabitCompletions';
import { toUserMessage } from '@/lib/errors';

export type HabitCompletionsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface habitCompletionState {
  habitCompletions: HabitCompletion[];

  habitCompletionsStatus: HabitCompletionsStatus;
  habitCompletionsError: string | null;

  /**
   * Load the complete habit-completion history
   * for the currently authenticated user.
   */
  fetchHabitCompletions: () => Promise<void>;

  /**
   * Insert or replace a completion.
   *
   * The uniqueness boundary is:
   *   habit + occurrenceDate
   *
   * This will be used by the socket layer later.
   */
  upsertHabitCompletion: (completion: HabitCompletion) => void;

  /**
   * Remove a completion by its database id.
   *
   * Not currently used by the initial fetch flow,
   * but gives the slice the primitive needed for
   * future undo/delete behavior.
   */
  removeHabitCompletion: (completionId: string) => void;

  /**
   * Clear completion state on sign-out/user change.
   */
  resetHabitCompletions: () => void;
}

const initialHabitCompletionState = {
  habitCompletions: [] as HabitCompletion[],

  habitCompletionsStatus: 'idle' as HabitCompletionsStatus,

  habitCompletionsError: null as string | null,
};

function sortHabitCompletions(
  completions: HabitCompletion[],
): HabitCompletion[] {
  return [...completions].sort(
    (a, b) =>
      b.occurrenceDate.localeCompare(a.occurrenceDate) ||
      b.completedAt.localeCompare(a.completedAt),
  );
}

export const CreateHabitCompletionSlice: StateCreator<habitCompletionState> = (
  set,
  get,
) => ({
  ...initialHabitCompletionState,

  fetchHabitCompletions: async () => {
    // Prevent duplicate requests.
    // This also protects against React Strict Mode
    // running the bootstrap effect twice.
    if (get().habitCompletionsStatus === 'loading') {
      return;
    }

    set({
      habitCompletionsStatus: 'loading',
      habitCompletionsError: null,
    });

    try {
      const result = await getHabitCompletions();

      const completions = result.data;

      if (!completions) {
        throw new Error('Failed to fetch habit completions');
      }

      set({
        habitCompletions: sortHabitCompletions(completions),

        habitCompletionsStatus: 'ready',

        habitCompletionsError: null,
      });
    } catch (error) {
      set({
        habitCompletionsStatus: 'error',

        habitCompletionsError: toUserMessage(
          error,
          'Something went wrong while loading habit completions.',
        ),
      });
    }
  },

  upsertHabitCompletion: (completion) => {
    console.log('[HabitCompletion] received from server:', completion);
    set((state) => {
      const existingIndex = state.habitCompletions.findIndex(
        (existing) =>
          existing.itemId === completion.itemId &&
          existing.occurrenceDate === completion.occurrenceDate,
      );

      // No existing completion for this
      // habit occurrence.
      if (existingIndex === -1) {
        return {
          habitCompletions: sortHabitCompletions([
            ...state.habitCompletions,
            completion,
          ]),
        };
      }

      // Existing completion means this is an
      // idempotent update/replacement.
      const next = [...state.habitCompletions];

      next[existingIndex] = completion;

      return {
        habitCompletions: sortHabitCompletions(next),
      };
    });
  },

  removeHabitCompletion: (completionId) => {
    set((state) => ({
      habitCompletions: state.habitCompletions.filter(
        (completion) => completion.id !== completionId,
      ),
    }));
  },

  resetHabitCompletions: () => {
    set({
      ...initialHabitCompletionState,
    });
  },
});
