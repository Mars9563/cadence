'use client';

import { useMemo, useState } from 'react';

import { useCadenceToday } from '@/hooks/useCadenceToday';

import { formatCadenceDate } from '@/lib/history';

import {
  useItemsReady,
  useSelectedDate,
  useTaskItems,
} from '@/store/selectors';

import { AddTaskDialog } from '../dialogs/AddTaskDialog';
import { ItemsSection } from '../ItemSection';
import { TaskRow } from '../rows/TaskRow';

export function TasksSection() {
  const tasks = useTaskItems();

  const ready = useItemsReady();

  const today = useCadenceToday();

  const selectedDate = useSelectedDate();

  const [dialogOpen, setDialogOpen] = useState(false);

  const historyDate =
    selectedDate !== null && selectedDate < today ? selectedDate : undefined;

  const visibleTasks = useMemo(() => {
    if (historyDate !== undefined) {
      return tasks.filter((task) => task.scheduledDate === historyDate);
    }

    return tasks.filter((task) => task.scheduledDate >= today);
  }, [historyDate, tasks, today]);

  return (
    <>
      <ItemsSection
        title="Tasks"
        description={
          historyDate === undefined
            ? "Today and what's coming up."
            : `Task history for ${formatCadenceDate(historyDate)}.`
        }
        actionLabel="Add task"
        onAction={() => setDialogOpen(true)}
        actionDisabled={!ready || historyDate !== undefined}
        showAction={historyDate === undefined}
        isLoading={!ready}
        isEmpty={visibleTasks.length === 0}
        emptyMessage={
          historyDate === undefined
            ? 'Nothing scheduled. Add a task to plan your day.'
            : 'No tasks were scheduled for this day.'
        }
      >
        {visibleTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            today={today}
            historyDate={historyDate}
          />
        ))}
      </ItemsSection>

      <AddTaskDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
