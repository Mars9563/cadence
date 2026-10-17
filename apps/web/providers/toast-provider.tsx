'use client';

import type { CSSProperties } from 'react';
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from 'lucide-react';
import { Toaster as Sonner } from 'sonner';

/*
 * Toasts in the app's own style: the raised surface used by menus and
 * dialogs, the UI type, and only a small coloured icon to say the kind
 * (sage = success, amber = warning, red = error). Sonner's bright tinted
 * "rich colours" are off on purpose.
 *
 * Sonner reads these variables for its default ("normal") look; they map
 * onto the workspace tokens from app/globals.css.
 */
const TOAST_VARIABLES = {
  '--normal-bg': 'var(--cd-surface-raised)',
  '--normal-text': 'var(--cd-text-primary)',
  '--normal-border': 'var(--cd-border-subtle)',
  '--border-radius': 'var(--cd-radius-lg)',
} as CSSProperties;

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      closeButton
      duration={4000}
      // Phones: below the notch / status bar.
      mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      style={TOAST_VARIABLES}
      icons={{
        success: <CircleCheck className="text-primary size-4" />,
        error: <CircleAlert className="text-destructive size-4" />,
        warning: <TriangleAlert className="size-4 text-(--cd-warning)" />,
        info: <Info className="text-muted-foreground size-4" />,
        loading: <LoaderCircle className="text-muted-foreground size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'font-sans! text-(length:--cd-text-ui)! shadow-[var(--cd-shadow-popover)]! gap-2.5!',
          title: 'font-medium! text-foreground!',
          description: 'text-muted-foreground! text-(length:--cd-text-meta)!',
          closeButton:
            'bg-surface-raised! border-border! text-muted-foreground! hover:text-foreground!',
          actionButton: 'bg-primary! text-primary-foreground!',
          cancelButton: 'bg-fill-selected! text-foreground!',
        },
      }}
    />
  );
}
