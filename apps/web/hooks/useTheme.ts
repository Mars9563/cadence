'use client';

import { useSyncExternalStore } from 'react';
import type { ThemeId } from '@cadence/types';

import { currentTheme, DEFAULT_THEME, subscribeTheme } from '@/lib/theme';

/** The active colour theme (the default on the server). Re-renders on change. */
export function useTheme(): ThemeId {
  return useSyncExternalStore(subscribeTheme, currentTheme, () => DEFAULT_THEME);
}
