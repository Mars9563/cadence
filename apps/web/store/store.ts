import { create } from 'zustand';
import { CadenceAppStore } from './types';
import { CreateUiSlice } from './slices/uiSlice';
import { CreateAuthSlice } from './slices/authSlice';

export const useCadenceStore = create<CadenceAppStore>()((...args) => ({
  ...CreateUiSlice(...args),
  ...CreateAuthSlice(...args),
  
}));
