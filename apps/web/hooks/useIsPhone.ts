'use client';

import { useSyncExternalStore } from 'react';

/** The phone layout's breakpoint: below Tailwind's `md` (768px). */
export const PHONE_QUERY = '(max-width: 767.98px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * True below 768px. For layouts that need a different component tree on
 * phones (Notes); plain styling uses Tailwind's `md:` / `max-md:` instead.
 */
export function useIsPhone() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}
