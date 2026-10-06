import { authState } from './slices/authSlice';
import { habitCompletionState } from './slices/habitCompletionSlice';
import { itemState } from './slices/itemSlice';
import { socketState } from './slices/socketSlice';
import { uiState } from './slices/uiSlice';

export type CadenceAppStore = uiState & authState & itemState & habitCompletionState & socketState;
