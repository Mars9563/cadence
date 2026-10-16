import { authState } from './slices/authSlice';
import { dailyNoteState } from './slices/dailyNoteSlice';
import { habitCompletionState } from './slices/habitCompletionSlice';
import { itemState } from './slices/itemSlice';
import { notesState } from './slices/notesSlice';
import { noteTabsState } from './slices/noteTabsSlice';
import { socketState } from './slices/socketSlice';
import { uiState } from './slices/uiSlice';

export type CadenceAppStore = uiState &
  authState &
  itemState &
  dailyNoteState &
  habitCompletionState &
  notesState &
  noteTabsState &
  socketState;
