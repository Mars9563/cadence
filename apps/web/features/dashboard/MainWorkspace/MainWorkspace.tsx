'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useFetchItems,
  useItemsError,
  useItemsStatus,
} from '@/store/selectors';
import { HabitsSection } from './sections/HabitSection';
import { NormalItemsSection } from './sections/NormalItemsSection';
import { TasksSection } from './sections/TaskSection';

export function MainWorkspace() {
  const status = useItemsStatus();
  const error = useItemsError();
  const fetchItems = useFetchItems();

  if (status === 'error') {
    return (
      <section className="min-w-0 overflow-y-auto pr-1">
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Your items didn&apos;t load
              </h2>

              <p className="text-muted-foreground text-sm">{error}</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchItems()}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="min-w-0 overflow-y-auto pr-1">
      <HabitsSection />
      <TasksSection />
      <NormalItemsSection />
    </section>
  );
}
