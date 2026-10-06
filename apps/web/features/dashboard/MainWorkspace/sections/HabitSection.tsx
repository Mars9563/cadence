'use client';

import { useMemo, useState } from 'react';

import { useCadenceToday } from '@/hooks/useCadenceToday';

import { formatCadenceDate, habitOccursOnDate } from '@/lib/history';

import {
  useHabitItems,
  useItemsReady,
  useSelectedDate,
} from '@/store/selectors';

import { AddHabitDialog } from '../dialogs/AddHabitDialog';
import { ItemsSection } from '../ItemSection';
import { HabitRow } from '../rows/Habitrow';

export function HabitsSection() {
  const habits = useHabitItems();

  const ready = useItemsReady();

  const today = useCadenceToday();

  const selectedDate = useSelectedDate();

  const [dialogOpen, setDialogOpen] = useState(false);

  const historyDate =
    selectedDate !== null && selectedDate < today ? selectedDate : undefined;

  const visibleHabits = useMemo(() => {
    if (historyDate !== undefined) {
      return habits.filter((habit) => habitOccursOnDate(habit, historyDate));
    }

    return habits.filter(
      (habit) =>
        habit.recurrenceEndDate === null || habit.recurrenceEndDate >= today,
    );
  }, [habits, historyDate, today]);

  return (
    <>
      <ItemsSection
        title="Habits"
        description={
          historyDate === undefined
            ? 'Build the person you want to be.'
            : `Habit history for ${formatCadenceDate(historyDate)}.`
        }
        actionLabel="Add habit"
        onAction={() => setDialogOpen(true)}
        actionDisabled={!ready || historyDate !== undefined}
        showAction={historyDate === undefined}
        isLoading={!ready}
        isEmpty={visibleHabits.length === 0}
        emptyMessage={
          historyDate === undefined
            ? 'No habits yet. Add one to start a routine.'
            : 'No habit was scheduled for this day.'
        }
      >
        {visibleHabits.map((habit) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            today={today}
            historyDate={historyDate}
          />
        ))}
      </ItemsSection>

      <AddHabitDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
