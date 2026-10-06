import type { ReactNode } from 'react';

import { MdAdd } from 'react-icons/md';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
    <div className="divide-y" aria-hidden>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex min-h-16 items-center gap-3 px-4 py-3.5">
          <div className="bg-muted size-4 animate-pulse rounded-md" />

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="bg-muted h-3.5 w-2/5 animate-pulse rounded" />
            <div className="bg-muted h-2.5 w-1/4 animate-pulse rounded" />
          </div>

          <div className="bg-muted h-2.5 w-14 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

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
    <section className="mb-7" aria-busy={isLoading}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">
            {title}
          </h2>

          <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
            {description}
          </p>
        </div>

        {showAction ? (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-lg"
            onClick={onAction}
            disabled={actionDisabled}
          >
            <MdAdd size={17} />
            <span className="hidden sm:inline">{actionLabel}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <RowsSkeleton />
          ) : isEmpty ? (
            <div className="flex min-h-24 items-center justify-center px-5 py-7 text-center">
              <p className="text-muted-foreground max-w-sm text-xs leading-relaxed sm:text-sm">
                {emptyMessage}
              </p>
            </div>
          ) : (
            <div className="divide-y">{children}</div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
