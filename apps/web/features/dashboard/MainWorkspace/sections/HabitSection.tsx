'use client';

import { useMemo, useState } from 'react';

import { useCadenceToday } from '@/hooks/useCadenceToday';
import { useHabitItems, useItemsReady } from '@/store/selectors';
import { AddHabitDialog } from '../dialogs/AddHabitDialog';
import { ItemsSection } from '../ItemSection';
import { HabitRow } from '../rows/Habitrow';

export function HabitsSection() {
  const habits = useHabitItems();
  const ready = useItemsReady();
  const today = useCadenceToday();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Habits whose end date has passed are history, so they aren't listed.
  const activeHabits = useMemo(
    () =>
      habits.filter(
        (habit) =>
          habit.recurrenceEndDate === null || habit.recurrenceEndDate >= today,
      ),
    [habits, today],
  );

  return (
    <>
      <ItemsSection
        title="Habits"
        description="Build the person you want to be."
        actionLabel="Add habit"
        onAction={() => setDialogOpen(true)}
        actionDisabled={!ready}
        isLoading={!ready}
        isEmpty={activeHabits.length === 0}
        emptyMessage="No habits yet. Add one to start a routine."
      >
        {activeHabits.map((habit) => (
          <HabitRow key={habit.id} habit={habit} today={today} />
        ))}
      </ItemsSection>

      <AddHabitDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
