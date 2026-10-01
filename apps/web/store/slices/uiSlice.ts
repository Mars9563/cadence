import { StateCreator } from 'zustand';

export type ViewMode = 'Dashboard' | 'Notes';

export interface uiState {
  ViewMode: ViewMode;
  signOutModalOpen: boolean;
  currentDateTime: Date;
  cadenceDayEnd: Date | null;

  setViewMode: (value: ViewMode) => void;
  setSignOutModalOpen: (command: boolean) => void;
  setCurrentDateTime: (date: Date) => void;
  setCadenceDayEnd: (date: Date | null) => void;
}

export const CreateUiSlice: StateCreator<uiState> = (set) => ({
  ViewMode: 'Dashboard',
  signOutModalOpen: false,
  currentDateTime: new Date(),
  cadenceDayEnd: null,

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
});
