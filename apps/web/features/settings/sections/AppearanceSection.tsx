'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { THEME_IDS, type ThemeId } from '@cadence/types';

import { updateProfile } from '@/api/profile';
import { toUserMessage } from '@/lib/errors';
import { applyTheme, THEMES } from '@/lib/theme';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { useIsSocketConnected, useSetUser } from '@/store/selectors';

import { SectionHeader } from '../SettingsModal';

/**
 * Choose the colour theme. It applies at once on this device and is saved
 * with the account (when online) so other devices follow.
 */
export function AppearanceSection() {
  const theme = useTheme();
  const setUser = useSetUser();
  const isOnline = useIsSocketConnected();
  const [error, setError] = useState<string | null>(null);

  async function choose(next: ThemeId) {
    if (next === theme) return;

    setError(null);
    applyTheme(next);

    try {
      setUser(await updateProfile({ theme: next }));
    } catch (caught) {
      setError(
        toUserMessage(caught, 'The theme is set on this device but couldn’t be saved to your account.'),
      );
    }
  }

  return (
    <div className="grid gap-6">
      <SectionHeader
        title="Appearance"
        description="A theme recolours all of Cadence. It’s saved with your account, so your other devices follow."
      />

      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {THEME_IDS.map((id) => {
          const def = THEMES[id];
          const selected = id === theme;

          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => void choose(id)}
              className={cn(
                'focus-visible:ring-ring/60 grid gap-2 rounded-lg border p-2 text-left outline-none focus-visible:ring-3',
                selected ? 'border-primary' : 'border-border hover:border-muted-foreground/50',
              )}
            >
              {/* A tiny picture of the workspace in this theme. */}
              <span
                aria-hidden="true"
                className="grid h-16 grid-cols-[30%_1fr] overflow-hidden rounded-md"
                style={{ background: def.background }}
              >
                <span style={{ background: def.surface }} />
                <span className="grid content-center gap-1.5 px-2.5">
                  <span className="h-1.5 w-3/4 rounded-full" style={{ background: def.swatch }} />
                  <span className="h-1.5 w-1/2 rounded-full opacity-40" style={{ background: def.swatch }} />
                  <span className="h-1.5 w-2/3 rounded-full opacity-25" style={{ background: def.swatch }} />
                </span>
              </span>
              <span className="flex items-center justify-between px-0.5 text-(length:--cd-text-ui)">
                {def.name}
                {selected ? <Check className="text-primary size-3.5" aria-hidden="true" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-(length:--cd-text-ui)">
          {error}
        </p>
      ) : !isOnline ? (
        <p className="text-muted-foreground text-(length:--cd-text-meta)">
          You’re offline: a new theme applies on this device and is saved to your account next time
          you choose one online.
        </p>
      ) : null}
    </div>
  );
}
