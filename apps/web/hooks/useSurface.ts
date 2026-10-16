'use client';

import { useLayoutEffect } from 'react';

/** Design surfaces defined in app/globals.css. */
export type Surface = 'workspace';

/**
 * Opt the current screen into a design surface while it is mounted.
 *
 * Sets `data-surface` on <html> rather than on the screen's root element so
 * portalled UI (menus, tooltips, dialogs, the editor's popups) picks up the
 * same tokens. Layout effect, so the first paint already has them.
 */
export function useSurface(surface: Surface) {
  useLayoutEffect(() => {
    const root = document.documentElement;

    root.dataset.surface = surface;

    return () => {
      if (root.dataset.surface === surface) {
        delete root.dataset.surface;
      }
    };
  }, [surface]);
}
