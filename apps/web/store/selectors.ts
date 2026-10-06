import { DEFAULT_DAY_END_TIME } from '@/lib/cadenceDate';
import { useCadenceStore } from './store';

// ui selectors ----

export const useViewMode = () => useCadenceStore((s) => s.ViewMode);

export const useSetViewMode = () => useCadenceStore((s) => s.setViewMode);

export const useSignOutModalOpen = () =>
  useCadenceStore((s) => s.signOutModalOpen);

export const useSetSignOutModalOpen = () =>
  useCadenceStore((s) => s.setSignOutModalOpen);

export const useCurrentDateTime = () =>
  useCadenceStore((s) => s.currentDateTime);

export const useSetCurrentDateTime = () =>
  useCadenceStore((s) => s.setCurrentDateTime);

export const useCadenceDayEnd = () => useCadenceStore((s) => s.cadenceDayEnd);

export const useSetCadenceDayEnd = () =>
  useCadenceStore((s) => s.setCadenceDayEnd);

export const useSelectedDate = () => useCadenceStore((s) => s.selectedDate);

export const useSetSelectedDate = () =>
  useCadenceStore((s) => s.setSelectedDate);

// auth selectors ----

export const useUser = () => useCadenceStore((s) => s.user);

export const useIsAuthenticated = () =>
  useCadenceStore((s) => s.isAuthenticated);

export const useSetUser = () => useCadenceStore((s) => s.setUser);

export const useSetIsAuthenticated = () =>
  useCadenceStore((s) => s.setIsAuthenticated);

/**
 * The user's day boundary ('HH:MM:SS');
 * the default until the profile loads.
 */
export const useDayEndTime = () =>
  useCadenceStore((s) => s.user?.dayEndTime ?? DEFAULT_DAY_END_TIME);

// items selectors ----

export const useNormalItems = () => useCadenceStore((s) => s.normalItems);

export const useTaskItems = () => useCadenceStore((s) => s.taskItems);

export const useHabitItems = () => useCadenceStore((s) => s.habitItems);

export const useItemsStatus = () => useCadenceStore((s) => s.itemsStatus);

export const useItemsError = () => useCadenceStore((s) => s.itemsError);

/** Items are loaded AND the profile is available. */
export const useItemsReady = () =>
  useCadenceStore((s) => s.itemsStatus === 'ready' && s.user !== null);

export const useFetchItems = () => useCadenceStore((s) => s.fetchItems);

export const useAddNormalItem = () => useCadenceStore((s) => s.addNormalItem);

export const useAddTaskItem = () => useCadenceStore((s) => s.addTaskItem);

export const useAddHabitItem = () => useCadenceStore((s) => s.addHabitItem);

export const useUpdateNormalItem = () =>
  useCadenceStore((s) => s.updateNormalItem);

export const useUpdateTaskItem = () => useCadenceStore((s) => s.updateTaskItem);

export const useResetItems = () => useCadenceStore((s) => s.resetItems);

// socket selectors ----

export const useIsSocketConnected = () =>
  useCadenceStore((s) => s.isSocketConnected);

export const useIsSocketConnecting = () =>
  useCadenceStore((s) => s.isSocketConnecting);

export const useSocket = () => useCadenceStore((s) => s.socket);

export const useConnectSocket = () => useCadenceStore((s) => s.connectSocket);

export const useDisconnectSocket = () =>
  useCadenceStore((s) => s.disconnectSocket);

// habit completion selectors ----

export const useHabitCompletions = () =>
  useCadenceStore((s) => s.habitCompletions);

export const useHabitCompletionsStatus = () =>
  useCadenceStore((s) => s.habitCompletionsStatus);

export const useHabitCompletionsError = () =>
  useCadenceStore((s) => s.habitCompletionsError);

export const useHabitCompletionsReady = () =>
  useCadenceStore((s) => s.habitCompletionsStatus === 'ready');

export const useFetchHabitCompletions = () =>
  useCadenceStore((s) => s.fetchHabitCompletions);

export const useUpsertHabitCompletion = () =>
  useCadenceStore((s) => s.upsertHabitCompletion);

export const useRemoveHabitCompletion = () =>
  useCadenceStore((s) => s.removeHabitCompletion);

export const useResetHabitCompletions = () =>
  useCadenceStore((s) => s.resetHabitCompletions);

// completion loading selectors ----

export const usePendingCompletionItemIds = () =>
  useCadenceStore((s) => s.pendingCompletionItemIds);

export const useIsItemCompletionPending = (itemId: string) =>
  useCadenceStore((s) => s.pendingCompletionItemIds.includes(itemId));

export const useMarkItemCompletionPending = () =>
  useCadenceStore((s) => s.markItemCompletionPending);

export const useClearItemCompletionPending = () =>
  useCadenceStore((s) => s.clearItemCompletionPending);

// socket completion ----

export const useCompleteItem = () => useCadenceStore((s) => s.completeItem);
