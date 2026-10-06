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

  /**
   * Items currently waiting for the server to confirm
   * a completion through the socket.
   */
  pendingCompletionItemIds: string[];

  fetchItems: () => Promise<void>;

  addNormalItem: (input: CreateNormalItemInput) => Promise<NormalItem>;
  addTaskItem: (input: CreateTaskItemInput) => Promise<TaskItem>;
  addHabitItem: (input: CreateHabitItemInput) => Promise<HabitItem>;

  markItemCompletionPending: (itemId: string) => void;
  clearItemCompletionPending: (itemId: string) => void;
  isItemCompletionPending: (itemId: string) => boolean;

  updateNormalItem: (item: NormalItem) => void;
  updateTaskItem: (item: TaskItem) => void;
  resetItems: () => void;
}

/* ── ordering ───────────────────────────────────────────────────────────── */

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

  pendingCompletionItemIds: [] as string[],
};

export const CreateItemSlice: StateCreator<itemState> = (set, get) => ({
  ...initialItemsState,

  fetchItems: async () => {
    if (get().itemsStatus === 'loading') {
      return;
    }

    set({
      itemsStatus: 'loading',
      itemsError: null,
    });

    try {
      const result = await getItems();
      const data = result.data;

      if (!data) {
        throw new Error('Failed to fetch items');
      }

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

    if (!item) {
      throw new Error('Failed to add normal item');
    }

    set((state) => ({
      normalItems: [item, ...state.normalItems],
    }));

    return item;
  },

  addTaskItem: async (input) => {
    const item = (await requestAddTaskItem(input)).data;

    if (!item) {
      throw new Error('Failed to add task item');
    }

    set((state) => ({
      taskItems: sortTasks([...state.taskItems, item]),
    }));

    return item;
  },

  addHabitItem: async (input) => {
    const item = (await requestAddHabitItem(input)).data;

    if (!item) {
      throw new Error('Failed to add habit item');
    }

    set((state) => ({
      habitItems: sortHabits([...state.habitItems, item]),
    }));

    return item;
  },

  markItemCompletionPending: (itemId) => {
    set((state) => {
      if (state.pendingCompletionItemIds.includes(itemId)) {
        return state;
      }

      return {
        pendingCompletionItemIds: [...state.pendingCompletionItemIds, itemId],
      };
    });
  },

  clearItemCompletionPending: (itemId) => {
    set((state) => ({
      pendingCompletionItemIds: state.pendingCompletionItemIds.filter(
        (id) => id !== itemId,
      ),
    }));
  },

  isItemCompletionPending: (itemId) =>
    get().pendingCompletionItemIds.includes(itemId),

  updateNormalItem: (item) => {
    set((state) => ({
      normalItems: state.normalItems.map((existing) =>
        existing.id === item.id ? item : existing,
      ),
    }));
  },

  updateTaskItem: (item) => {
    set((state) => ({
      taskItems: sortTasks(
        state.taskItems.map((existing) =>
          existing.id === item.id ? item : existing,
        ),
      ),
    }));
  },
  resetItems: () =>
    set({
      ...initialItemsState,
    }),
});
