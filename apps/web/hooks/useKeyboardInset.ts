'use client';

import { useEffect } from 'react';

/** Smallest inset treated as an open on-screen keyboard (px). */
const KEYBOARD_MIN_HEIGHT = 80;

/**
 * Keeps `--keyboard-inset` on <html> equal to how much of the layout the
 * on-screen keyboard covers, so a fixed bottom toolbar can sit just above
 * it. Mobile browsers shrink only the *visual* viewport when the keyboard
 * opens; fixed elements stay put behind it unless they are lifted.
 *
 *   inset = layout height - visible height - visible offset from the top
 *
 * 0 on desktop and whenever the keyboard is closed. Also toggles the
 * `keyboard-open` class on <html>. Mounted once.
 */
export function useKeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;

    if (!viewport) return;

    const update = () => {
      const inset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );

      root.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);

      // A real keyboard, not browser chrome settling (a few px).
      root.classList.toggle('keyboard-open', inset > KEYBOARD_MIN_HEIGHT);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      root.style.removeProperty('--keyboard-inset');
      root.classList.remove('keyboard-open');
    };
  }, []);
}
