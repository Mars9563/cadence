import { THEME_IDS, type ThemeId } from '@cadence/types';

/*
 * Colour themes. The palettes themselves live in app/globals.css as
 * html[data-theme='…'] overrides of the --cd-* tokens; this file holds what
 * JavaScript needs: names, the swatch shown in pickers, and the threads art
 * colours (WebGL takes hex values, not CSS variables).
 *
 * The chosen theme is cached on the device (THEME_STORAGE_KEY) so pages open
 * in it before anything loads; signed-in users' choice is also saved with
 * their account and wins when the profile loads.
 */

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  /** The accent colour, used for the picker dot. */
  swatch: string;
  /** The background colour, used behind the picker dot / preview tiles. */
  background: string;
  /** Raised surface, for preview tiles. */
  surface: string;
  threads: { color1: string; color2: string; color3: string };
};

export const DEFAULT_THEME: ThemeId = 'sage';
export const THEME_STORAGE_KEY = 'cadence:theme';

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  sage: {
    id: 'sage',
    name: 'Sage',
    swatch: '#B8C5B0',
    background: '#101112',
    surface: '#1D1F20',
    threads: { color1: '#6F8468', color2: '#B8C5B0', color3: '#D3DCCB' },
  },
  red: {
    id: 'red',
    name: 'Red',
    swatch: '#E0A3A3',
    background: '#130F10',
    surface: '#221A1B',
    threads: { color1: '#8A4A4F', color2: '#E0A3A3', color3: '#F0CFCF' },
  },
  blue: {
    id: 'blue',
    name: 'Blue',
    swatch: '#A7BDE0',
    background: '#0E1014',
    surface: '#1A1E26',
    threads: { color1: '#4D6690', color2: '#A7BDE0', color3: '#D2DEF2' },
  },
  purple: {
    id: 'purple',
    name: 'Purple',
    swatch: '#C4B0E2',
    background: '#110F14',
    surface: '#1F1A26',
    threads: { color1: '#6D5591', color2: '#C4B0E2', color3: '#E0D5F2' },
  },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

/**
 * Inline script for <head>: sets data-theme from the device cache before the
 * first paint, so a non-default theme never flashes the default colours.
 */
export const THEME_INIT_SCRIPT = `(function(){var t='${DEFAULT_THEME}';try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');if(${JSON.stringify(
  THEME_IDS,
)}.indexOf(s)!==-1)t=s;}catch(e){}document.documentElement.dataset.theme=t;})();`;

const listeners = new Set<() => void>();

/** Recolour the page now and remember the choice on this device. */
export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable: the theme still applies for this page.
  }

  for (const listener of listeners) listener();
}

/** Subscribe to theme changes (used by the useTheme hook). */
export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The active theme on the page (the default on the server). */
export function currentTheme(): ThemeId {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  const value = document.documentElement.dataset.theme;
  return isThemeId(value) ? value : DEFAULT_THEME;
}
