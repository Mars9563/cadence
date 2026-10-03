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

// auth selectors ----
export const useUser = () => useCadenceStore((s) => s.user);
export const useIsAuthenticated = () =>
  useCadenceStore((s) => s.isAuthenticated);

export const useSetUser = () => useCadenceStore((s) => s.setUser);
export const useSetIsAuthenticated = () =>
  useCadenceStore((s) => s.setIsAuthenticated);

/** The user's day boundary ('HH:MM:SS'); the default until the profile loads. */
export const useDayEndTime = () =>
  useCadenceStore((s) => s.user?.dayEndTime ?? DEFAULT_DAY_END_TIME);

// items selectors ----
// Arrays are returned as stored (already sorted in the slice) so the selector
// reference stays stable. Filter/derive in the component with useMemo.
export const useNormalItems = () => useCadenceStore((s) => s.normalItems);
export const useTaskItems = () => useCadenceStore((s) => s.taskItems);
export const useHabitItems = () => useCadenceStore((s) => s.habitItems);

export const useItemsStatus = () => useCadenceStore((s) => s.itemsStatus);
export const useItemsError = () => useCadenceStore((s) => s.itemsError);

/** Items are loaded AND the profile (day boundary) is available. */
export const useItemsReady = () =>
  useCadenceStore((s) => s.itemsStatus === 'ready' && s.user !== null);

export const useFetchItems = () => useCadenceStore((s) => s.fetchItems);
export const useAddNormalItem = () => useCadenceStore((s) => s.addNormalItem);
export const useAddTaskItem = () => useCadenceStore((s) => s.addTaskItem);
export const useAddHabitItem = () => useCadenceStore((s) => s.addHabitItem);
export const useResetItems = () => useCadenceStore((s) => s.resetItems);
