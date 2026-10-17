import { create } from 'zustand';

import { CadenceAppStore } from './types';

import { CreateUiSlice } from './slices/uiSlice';
import { CreateAuthSlice } from './slices/authSlice';
import { CreateItemSlice } from './slices/itemSlice';
import { CreateDailyNoteSlice } from './slices/dailyNoteSlice';
import { CreateSocketSlice } from './slices/socketSlice';
import { CreateHabitCompletionSlice } from './slices/habitCompletionSlice';
import { CreateNotesSlice } from './slices/notesSlice';
import { CreateNoteTabsSlice } from './slices/noteTabsSlice';
import { CreateSyncSlice } from './slices/syncSlice';

export const useCadenceStore = create<CadenceAppStore>()((...args) => ({
  ...CreateUiSlice(...args),
  ...CreateAuthSlice(...args),
  ...CreateItemSlice(...args),
  ...CreateDailyNoteSlice(...args),
  ...CreateSocketSlice(...args),
  ...CreateHabitCompletionSlice(...args),
  ...CreateNotesSlice(...args),
  ...CreateNoteTabsSlice(...args),
  ...CreateSyncSlice(...args),
}));
