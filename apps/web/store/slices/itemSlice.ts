import { StateCreator } from 'zustand';
import type { HabitItem, Item, NormalItem, TaskItem } from '@cadence/types';
import type {
  CreateHabitItemInput,
  CreateNormalItemInput,
  CreateTaskItemInput,
} from '@cadence/validation';

import { getItems } from '@/api/getItems';
import { daySettingsFor, getCadenceDate } from '@/lib/cadenceDate';
import { toUserMessage } from '@/lib/errors';
import type { NewSyncOp } from '@/lib/sync/types';
import { newId } from '@/lib/uuid';

import type { CadenceAppStore } from '../types';

export type ItemsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface itemState {
  normalItems: NormalItem[];
  taskItems: TaskItem[];
  habitItems: HabitItem[];

  itemsStatus: ItemsStatus;
  itemsError: string | null;

  /**
   * Items whose completion request is on its way to the server right now.
   * (A completion made offline is shown as done straight away and waits in
   * the sync queue; it is not "pending" in this sense.)
   */
  pendingCompletionItemIds: string[];

  fetchItems: () => Promise<void>;

  /*
   * Creates are optimistic: the item appears at once under a client id and
   * is sent now (online) or queued (offline). They reject only when the
   * server refuses the item outright, after removing it again, so a form
   * can show the error.
   */
  addNormalItem: (input: CreateNormalItemInput) => Promise<NormalItem>;
  addTaskItem: (input: CreateTaskItemInput) => Promise<TaskItem>;
  addHabitItem: (input: CreateHabitItemInput) => Promise<HabitItem>;

  /**
   * Mark an item done (or today's habit occurrence). Optimistic and queued
   * like creates; a refusal undoes it and tells the user why.
   */
  completeItem: (itemId: string) => void;

  markItemCompletionPending: (itemId: string) => void;
  clearItemCompletionPending: (itemId: string) => void;
  isItemCompletionPending: (itemId: string) => boolean;

  findItem: (itemId: string) => Item | undefined;

  /** Insert or replace an item in its kind's list (keeps list order). */
  upsertItem: (item: Item) => void;
  removeItem: (itemId: string) => void;

  /** Replace every list with server data (reconcile). */
  replaceItems: (data: {
    normalItems: NormalItem[];
    taskItems: TaskItem[];
    habitItems: HabitItem[];
  }) => void;

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

export function sortTasks(items: TaskItem[]): TaskItem[] {
  return [...items].sort(
    (a, b) =>
      a.scheduledDate.localeCompare(b.scheduledDate) ||
      compareTime(a.scheduledTime, b.scheduledTime) ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

export function sortHabits(items: HabitItem[]): HabitItem[] {
  return [...items].sort(
    (a, b) =>
      compareTime(a.scheduledTime, b.scheduledTime) ||
      a.title.localeCompare(b.title),
  );
}

/** Newest first, matching the server's created_at desc order. */
export function sortNormals(items: NormalItem[]): NormalItem[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const initialItemsState = {
  normalItems: [] as NormalItem[],
  taskItems: [] as TaskItem[],
  habitItems: [] as HabitItem[],

  itemsStatus: 'idle' as ItemsStatus,
  itemsError: null as string | null,

  pendingCompletionItemIds: [] as string[],
};

export const CreateItemSlice: StateCreator<
  CadenceAppStore,
  [],
  [],
  itemState
> = (set, get) => {
  /** Shared create flow for the three kinds. */
  const createItem = async <T extends Item>(
    op: Extract<NewSyncOp, { type: 'item.create' }>,
  ): Promise<T> => {
    get().applyOp(op);

    try {
      await get().runOrQueue(op);
    } catch (error) {
      get().removeItem(op.input.id);
      throw error;
    }

    return get().findItem(op.input.id) as T;
  };

  return {
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

        get().replaceItems(data);
        set({ itemsStatus: 'ready' });
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

    addNormalItem: (input) =>
      createItem<NormalItem>({
        type: 'item.create',
        kind: 'normal',
        input: { ...input, id: input.id ?? newId() },
      }),

    addTaskItem: (input) =>
      createItem<TaskItem>({
        type: 'item.create',
        kind: 'task',
        input: { ...input, id: input.id ?? newId() },
      }),

    addHabitItem: (input) =>
      createItem<HabitItem>({
        type: 'item.create',
        kind: 'habit',
        input: { ...input, id: input.id ?? newId() },
      }),

    completeItem: (itemId) => {
      const state = get();

      if (state.pendingCompletionItemIds.includes(itemId)) return;

      const item = state.findItem(itemId);

      if (!item) return;

      // The day the user is looking at; a late delivery is refused.
      const now = new Date();
      const expectedDate = getCadenceDate(now, daySettingsFor(state.user, now));

      // Completion is one-way and idempotent: a second tick is a no-op.
      const alreadyDone =
        item.kind === 'habit'
          ? state.habitCompletions.some(
              (completion) =>
                completion.itemId === itemId &&
                completion.occurrenceDate === expectedDate,
            )
          : item.completedAt !== null;

      if (alreadyDone) return;

      const op: NewSyncOp = { type: 'item.complete', itemId, expectedDate };

      state.applyOp(op);

      void state.runOrQueue(op).catch((error) => {
        get().rollbackOp(op, error);
      });
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

    findItem: (itemId) => {
      const { normalItems, taskItems, habitItems } = get();

      return (
        normalItems.find((item) => item.id === itemId) ??
        taskItems.find((item) => item.id === itemId) ??
        habitItems.find((item) => item.id === itemId)
      );
    },

    upsertItem: (item) => {
      set((state) => {
        switch (item.kind) {
          case 'normal':
            return {
              normalItems: sortNormals([
                ...state.normalItems.filter((i) => i.id !== item.id),
                item,
              ]),
            };

          case 'task':
            return {
              taskItems: sortTasks([
                ...state.taskItems.filter((i) => i.id !== item.id),
                item,
              ]),
            };

          case 'habit':
            return {
              habitItems: sortHabits([
                ...state.habitItems.filter((i) => i.id !== item.id),
                item,
              ]),
            };
        }
      });
    },

    removeItem: (itemId) => {
      set((state) => ({
        normalItems: state.normalItems.filter((item) => item.id !== itemId),
        taskItems: state.taskItems.filter((item) => item.id !== itemId),
        habitItems: state.habitItems.filter((item) => item.id !== itemId),
      }));
    },

    replaceItems: (data) => {
      set({
        normalItems: sortNormals(data.normalItems),
        taskItems: sortTasks(data.taskItems),
        habitItems: sortHabits(data.habitItems),
      });
    },

    updateNormalItem: (item) => get().upsertItem(item),

    updateTaskItem: (item) => get().upsertItem(item),

    resetItems: () =>
      set({
        ...initialItemsState,
      }),
  };
};
