import { StateCreator } from 'zustand';

export type ViewMode = 'Dashboard' | 'Notes';

export interface uiState {
  ViewMode: ViewMode;
  signOutModalOpen: boolean;
  currentDateTime: Date;

  setViewMode: (value: ViewMode) => void;
  setSignOutModalOpen: (command: boolean) => void;
  setCurrentDateTime: (date: Date) => void;
}

export const CreateUiSlice: StateCreator<uiState> = (set) => ({
  ViewMode: 'Dashboard',
  signOutModalOpen: false,
  currentDateTime: new Date(),

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
});
