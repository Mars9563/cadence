'use client';

import { Orb } from '@yogesharc/thinking-orbs';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { NoteSaveStatus } from '@/hooks/useNoteAutosave';

type NoteSaveIndicatorProps = {
  status: NoteSaveStatus;
  error: string | null;
};

/*
 * Same orb language as the Daily Note indicator, condensed: the orb alone
 * says the state (accent resting = saved, spinning = saving, amber = unsaved,
 * red retrying = failed) and the words live in a tooltip. Tones come from the
 * workspace palette so the indicator stays as quiet as the chrome around it. Only a failure
 * also shows a short label, because it needs attention.
 */
const LOOK = {
  saved: {
    state: 'base',
    speed: 0.5,
    paused: true,
    tone: 'text-primary',
    label: 'Saved',
  },
  saving: {
    state: 'working',
    speed: 0.8,
    paused: false,
    tone: 'text-faint-foreground',
    label: 'Saving…',
  },
  dirty: {
    state: 'working',
    speed: 0.55,
    paused: true,
    tone: 'text-(--cd-warning)',
    label: 'Unsaved changes',
  },
  error: {
    state: 'retrying',
    speed: 0.8,
    paused: false,
    tone: 'text-destructive',
    label: 'Could not save. Retrying…',
  },
} as const;

export function NoteSaveIndicator({ status, error }: NoteSaveIndicatorProps) {
  if (status === 'idle') {
    return null;
  }

  const look = LOOK[status];
  const label = status === 'error' ? (error ?? look.label) : look.label;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="status"
            aria-live="polite"
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-xs',
              look.tone,
            )}
          />
        }
      >
        <Orb
          state={look.state}
          size={14}
          speed={look.speed}
          paused={look.paused}
          label={label}
          className={look.tone}
        />

        {status === 'error' && <span>Retrying</span>}
      </TooltipTrigger>

      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
