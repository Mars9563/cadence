'use client';

import { THEME_IDS } from '@cadence/types';

import { applyTheme, THEMES } from '@/lib/theme';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

/**
 * Four dots that recolour the whole page live (threads included). The
 * choice is remembered on this device, so sign-in and the app open in it.
 */
export function ThemeSwitcher({ className }: { className?: string }) {
  const theme = useTheme();

  return (
    <div role="radiogroup" aria-label="Colour theme" className={cn('flex items-center gap-1.5', className)}>
      {THEME_IDS.map((id) => {
        const def = THEMES[id];
        const selected = id === theme;

        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${def.name} theme`}
            title={def.name}
            onClick={() => applyTheme(id)}
            className={cn(
              'focus-visible:ring-ring/60 grid size-6 place-items-center rounded-full outline-none focus-visible:ring-3',
              selected ? 'ring-foreground/70 ring-1' : 'hover:ring-muted-foreground/40 hover:ring-1',
            )}
          >
            <span className="size-3 rounded-full" style={{ background: def.swatch }} />
          </button>
        );
      })}
    </div>
  );
}
