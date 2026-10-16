import { Orb } from '@yogesharc/thinking-orbs';

import type { DailyNoteSaveStatus } from '@/hooks/useDailyNoteAutosave';

type DailyNoteSaveIndicatorProps = {
  status: DailyNoteSaveStatus;
  error: string | null;
};

export function DailyNoteSaveIndicator({
  status,
  error,
}: DailyNoteSaveIndicatorProps) {
  if (status === 'idle') {
    return null;
  }

  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Orb
          state="base"
          size={14}
          speed={0.5}
          paused
          label="Saved"
          className="text-primary"
        />
        Saved
      </span>
    );
  }

  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Orb
          state="working"
          size={14}
          speed={0.8}
          label="Saving"
          className="text-faint-foreground"
        />
        Saving…
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-destructive"
        role="status"
        aria-live="polite"
      >
        <Orb
          state="retrying"
          size={14}
          speed={0.8}
          label="Save failed"
          className="text-destructive"
        />
        {error ?? 'Could not save. Retrying…'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Orb
        state="working"
        size={14}
        speed={0.55}
        paused
        label="Unsaved changes"
        className="text-(--cd-warning)"
      />
      Unsaved changes
    </span>
  );
}
