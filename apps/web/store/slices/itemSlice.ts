import { StateCreator } from 'zustand';
import type { HabitItem, NormalItem, TaskItem } from '@cadence/types';
import type {
  CreateHabitItemInput,
  CreateNormalItemInput,
  CreateTaskItemInput,
} from '@cadence/validation';

import { addHabitItem as requestAddHabitItem } from '@/api/addHabitItem';
import { addNormalItem as requestAddNormalItem } from '@/api/addNormalItem';
import { addTaskItem as requestAddTaskItem } from '@/api/addTaskItem';
import { getItems } from '@/api/getItems';
import { toUserMessage } from '@/lib/errors';

export type ItemsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface itemState {
  normalItems: NormalItem[];
  taskItems: TaskItem[];
  habitItems: HabitItem[];

  itemsStatus: ItemsStatus;
  itemsError: string | null;

  /** Load every item for the signed-in user. Safe to call repeatedly. */
  fetchItems: () => Promise<void>;

  /**
   * Create actions call the backend, then put the stored row in the store.
   * They throw on failure so the calling dialog can show the error.
   */
  addNormalItem: (input: CreateNormalItemInput) => Promise<NormalItem>;
  addTaskItem: (input: CreateTaskItemInput) => Promise<TaskItem>;
  addHabitItem: (input: CreateHabitItemInput) => Promise<HabitItem>;

  /** Call on sign-out so the next user never sees stale items. */
  resetItems: () => void;
}

/* ── ordering ─────────────────────────────────────────────────────────────
 * Normal items: newest first (the API order, new items are prepended).
 * Tasks:        by date, then time (untimed after timed), then newest first.
 * Habits:       by time (untimed last), then title.
 * Kept sorted inside the store so selectors can return stable references.
 */

function compareTime(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

function sortTasks(items: TaskItem[]): TaskItem[] {
  return [...items].sort(
    (a, b) =>
      a.scheduledDate.localeCompare(b.scheduledDate) ||
      compareTime(a.scheduledTime, b.scheduledTime) ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

function sortHabits(items: HabitItem[]): HabitItem[] {
  return [...items].sort(
    (a, b) =>
      compareTime(a.scheduledTime, b.scheduledTime) ||
      a.title.localeCompare(b.title),
  );
}

const initialItemsState = {
  normalItems: [] as NormalItem[],
  taskItems: [] as TaskItem[],
  habitItems: [] as HabitItem[],
  itemsStatus: 'idle' as ItemsStatus,
  itemsError: null as string | null,
};

export const CreateItemSlice: StateCreator<itemState> = (set, get) => ({
  ...initialItemsState,

  fetchItems: async () => {
    // Also absorbs React Strict Mode's double-invoked effects.
    if (get().itemsStatus === 'loading') return;

    set({ itemsStatus: 'loading', itemsError: null });

    try {
      const result = await getItems();
      const data = result.data;

      if (!data) throw new Error('Failed to fetch items');

      set({
        normalItems: data.normalItems,
        taskItems: sortTasks(data.taskItems),
        habitItems: sortHabits(data.habitItems),
        itemsStatus: 'ready',
      });
    } catch (error) {
      set({
        itemsStatus: 'error',
        itemsError: toUserMessage(
          error,
          'Something went wrong while loading your items.',
        ),
      });
    }
  },

  addNormalItem: async (input) => {
    const item = (await requestAddNormalItem(input)).data;

    if (!item) throw new Error('Failed to add normal item');

    set((state) => ({ normalItems: [item, ...state.normalItems] }));

    return item;
  },

  addTaskItem: async (input) => {
    const item = (await requestAddTaskItem(input)).data;

    if (!item) throw new Error('Failed to add task item');

    set((state) => ({ taskItems: sortTasks([...state.taskItems, item]) }));

    return item;
  },

  addHabitItem: async (input) => {
    const item = (await requestAddHabitItem(input)).data;

    if (!item) throw new Error('Failed to add habit item');

    set((state) => ({ habitItems: sortHabits([...state.habitItems, item]) }));

    return item;
  },

  resetItems: () => set({ ...initialItemsState }),
});
