import { StateCreator } from 'zustand';

export type ViewMode = 'Dashboard' | 'Notes';

export interface uiState {
  ViewMode: ViewMode;
  signOutModalOpen: boolean;
  currentDateTime: Date;
  cadenceDayEnd: Date | null;

  selectedDate: string | null;

  /**
   * The first load finished. Never goes back to false in a page session:
   * the full-screen loader is for the first load only, and losing the
   * connection later must not unmount the app (or its unsaved editors).
   */
  appReady: boolean;

  setAppReady: () => void;

  setViewMode: (value: ViewMode) => void;
  setSignOutModalOpen: (command: boolean) => void;
  setCurrentDateTime: (date: Date) => void;
  setCadenceDayEnd: (date: Date | null) => void;

  setSelectedDate: (date: string | null) => void;
}

export const CreateUiSlice: StateCreator<uiState> = (set) => ({
  ViewMode: 'Dashboard',
  signOutModalOpen: false,
  currentDateTime: new Date(),
  cadenceDayEnd: null,

  selectedDate: null,

  appReady: false,

  setAppReady: () => set({ appReady: true }),

  setViewMode: (value) =>
    set({
      ViewMode: value,
    }),

  setSignOutModalOpen: (command) =>
    set({
      signOutModalOpen: command,
    }),

  setCurrentDateTime: (date) =>
    set({
      currentDateTime: date,
    }),

  setCadenceDayEnd: (date) =>
    set({
      cadenceDayEnd: date,
    }),

  setSelectedDate: (date) =>
    set({
      selectedDate: date,
    }),
});
