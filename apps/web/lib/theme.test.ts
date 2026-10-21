import { THEME_IDS } from '@cadence/types';
import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME, isThemeId, THEME_INIT_SCRIPT, THEME_STORAGE_KEY, THEMES } from './theme';

describe('themes', () => {
  it('defines every theme id, each with threads colours', () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_IDS].sort());
    for (const id of THEME_IDS) {
      expect(THEMES[id].threads.color1).toMatch(/^#[0-9A-F]{6}$/i);
      expect(THEMES[id].threads.color3).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(DEFAULT_THEME).toBe('sage');
  });

  it('recognises only known ids', () => {
    expect(isThemeId('purple')).toBe(true);
    expect(isThemeId('neon')).toBe(false);
    expect(isThemeId(null)).toBe(false);
  });
});

describe('THEME_INIT_SCRIPT (runs before first paint)', () => {
  function run(stored: string | null, throws = false) {
    const root = { dataset: {} as Record<string, string> };
    const localStorage = {
      getItem: (key: string) => {
        if (throws) throw new Error('blocked');
        return key === THEME_STORAGE_KEY ? stored : null;
      },
    };
    new Function('document', 'localStorage', THEME_INIT_SCRIPT)({ documentElement: root }, localStorage);
    return root.dataset.theme;
  }

  it('applies a stored theme', () => {
    expect(run('blue')).toBe('blue');
  });

  it('falls back to the default for missing, unknown or blocked storage', () => {
    expect(run(null)).toBe('sage');
    expect(run('neon')).toBe('sage');
    expect(run('red', true)).toBe('sage');
  });
});
