'use client';

import { useLayoutEffect } from 'react';

/** Design surfaces defined in app/globals.css. */
export type Surface = 'workspace';

/*
 * Reference count per surface: the first-load screen and the app both use
 * the workspace surface and overlap while the loader fades out, so one of
 * them unmounting must not remove it from under the other.
 */
const holders = new Map<Surface, number>();

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

    holders.set(surface, (holders.get(surface) ?? 0) + 1);
    root.dataset.surface = surface;

    return () => {
      const remaining = (holders.get(surface) ?? 1) - 1;

      holders.set(surface, remaining);

      if (remaining === 0 && root.dataset.surface === surface) {
        delete root.dataset.surface;
      }
    };
  }, [surface]);
}
