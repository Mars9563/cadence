import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ItemsSectionProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;

  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage: string;

  children: ReactNode;
}

function RowsSkeleton() {
  return (
    <div className="divide-y" aria-hidden>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 px-4 py-3">
          <div className="bg-muted size-4 animate-pulse rounded-sm" />
          <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
          <div className="bg-muted h-3 w-16 animate-pulse rounded" />
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
  isLoading,
  isEmpty,
  emptyMessage,
  children,
}: ItemsSectionProps) {
  return (
    <section className="mb-8" aria-busy={isLoading}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

          <p className="text-muted-foreground text-sm">{description}</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          disabled={actionDisabled}
        >
          <Plus />
          {actionLabel}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <RowsSkeleton />
          ) : isEmpty ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              {emptyMessage}
            </p>
          ) : (
            <div className="divide-y">{children}</div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
