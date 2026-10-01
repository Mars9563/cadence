import { authState } from './slices/authSlice';
import { uiState } from './slices/uiSlice';

export type CadenceAppStore = uiState & authState;
