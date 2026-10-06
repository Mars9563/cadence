import { create } from 'zustand';
import { CadenceAppStore } from './types';
import { CreateUiSlice } from './slices/uiSlice';
import { CreateAuthSlice } from './slices/authSlice';
import { CreateItemSlice } from './slices/itemSlice';
import { CreateSocketSlice } from './slices/socketSlice';
import { CreateHabitCompletionSlice } from './slices/habitCompletionSlice';

export const useCadenceStore = create<CadenceAppStore>()((...args) => ({
  ...CreateUiSlice(...args),
  ...CreateAuthSlice(...args),
  ...CreateItemSlice(...args),
  ...CreateSocketSlice(...args),
  ...CreateHabitCompletionSlice(...args),
}));
