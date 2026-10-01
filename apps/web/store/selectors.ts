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
