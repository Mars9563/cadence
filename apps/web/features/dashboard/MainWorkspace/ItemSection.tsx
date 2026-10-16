import type { ReactNode } from 'react';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ItemsSectionProps {
  title: string;
  description: string;

  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;

  showAction?: boolean;

  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage: string;

  children: ReactNode;
}

function RowsSkeleton() {
  return (
    <div className="divide-y divide-border/50" aria-hidden>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex min-h-13 items-center gap-3 px-2 py-3">
          <div className="bg-fill-selected size-4 animate-pulse rounded-[4px]" />

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="bg-fill-selected h-3 w-2/5 animate-pulse rounded-sm" />
            <div className="bg-fill-hover h-2.5 w-1/4 animate-pulse rounded-sm" />
          </div>

          <div className="bg-fill-hover h-2.5 w-14 animate-pulse rounded-sm" />
        </div>
      ))}
    </div>
  );
}

/**
 * One list on the day page: a heading row with its add action, then the
 * rows on the canvas, separated by hairlines (no card around them).
 */
export function ItemsSection({
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled = false,
  showAction = true,
  isLoading,
  isEmpty,
  emptyMessage,
  children,
}: ItemsSectionProps) {
  return (
    <section className="mb-10" aria-busy={isLoading}>
      <div className="mb-2 flex items-end justify-between gap-4 border-b border-border/70 pb-2">
        <div className="min-w-0">
          <h2 className="text-foreground text-(length:--cd-text-control) font-semibold">
            {title}
          </h2>

          <p className="text-muted-foreground mt-0.5 text-(length:--cd-text-ui)">
            {description}
          </p>
        </div>

        {showAction ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:bg-fill-hover dark:hover:bg-fill-hover hover:text-foreground -mr-2 h-7 shrink-0 gap-1.5 px-2 text-(length:--cd-text-ui)"
            onClick={onAction}
            disabled={actionDisabled}
          >
            <Plus aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">{actionLabel}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <RowsSkeleton />
      ) : isEmpty ? (
        <p className="text-muted-foreground px-2 py-4 text-(length:--cd-text-ui)">
          {emptyMessage}
        </p>
      ) : (
        <div className="divide-y divide-border/50">{children}</div>
      )}
    </section>
  );
}
