'use client';

import { History } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { useCadenceToday } from '@/hooks/useCadenceToday';

import { formatCadenceDate } from '@/lib/history';

import {
  useFetchItems,
  useItemsError,
  useItemsStatus,
  useSelectedDate,
} from '@/store/selectors';

import { HabitsSection } from './sections/HabitSection';
import { NormalItemsSection } from './sections/NormalItemsSection';
import { TasksSection } from './sections/TaskSection';

export function MainWorkspace() {
  const status = useItemsStatus();

  const error = useItemsError();

  const fetchItems = useFetchItems();

  const today = useCadenceToday();

  const selectedDate = useSelectedDate();

  const historyDate =
    selectedDate !== null && selectedDate < today ? selectedDate : undefined;

  if (status === 'error') {
    return (
      <section role="alert" className="flex min-w-0 flex-col items-start gap-4 py-2">
        <div className="space-y-1">
          <h2 className="text-foreground text-(length:--cd-text-control) font-medium">
            Your items didn&apos;t load
          </h2>

          <p className="text-muted-foreground text-(length:--cd-text-ui)">{error}</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="text-(length:--cd-text-ui)"
          onClick={() => void fetchItems()}
        >
          Try again
        </Button>
      </section>
    );
  }

  return (
    <div className="min-w-0">
      {historyDate !== undefined ? (
        <div className="bg-fill-hover mb-8 flex gap-3 rounded-md px-3 py-2.5">
          <History
            aria-hidden="true"
            className="text-muted-foreground mt-0.5 size-4 shrink-0"
          />

          <p className="text-muted-foreground text-(length:--cd-text-ui) leading-relaxed">
            <span className="text-foreground font-medium">
              {formatCadenceDate(historyDate)}.
            </span>{' '}
            Completed items are checked; missed scheduled items are locked.
          </p>
        </div>
      ) : null}

      <HabitsSection />

      <TasksSection />

      <NormalItemsSection />
    </div>
  );
}
