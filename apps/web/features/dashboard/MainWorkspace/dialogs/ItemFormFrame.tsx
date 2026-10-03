'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';

interface ItemFormFrameProps {
  submitLabel: string;
  submitting: boolean;
  formError: string | null;
  onSubmit: () => void;
  onCancel: () => void;
  children: ReactNode;
}

export function ItemFormFrame({
  submitLabel,
  submitting,
  formError,
  onSubmit,
  onCancel,
  children,
}: ItemFormFrameProps) {
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!submitting) onSubmit();
      }}
    >
      {children}

      {formError ? (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      ) : null}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
