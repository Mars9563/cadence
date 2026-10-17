'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      duration={4000}
      // Phones: below the notch / status bar.
      mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
    />
  );
}
