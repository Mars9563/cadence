import { authState } from './slices/authSlice';
import { itemState } from './slices/itemSlice';
import { uiState } from './slices/uiSlice';

export type CadenceAppStore = uiState & authState & itemState;
