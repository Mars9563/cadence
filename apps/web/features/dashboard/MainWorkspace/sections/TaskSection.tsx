'use client';

import { useMemo, useState } from 'react';

import { useCadenceToday } from '@/hooks/useCadenceToday';
import { useItemsReady, useTaskItems } from '@/store/selectors';
import { AddTaskDialog } from '../dialogs/AddTaskDialog';
import { ItemsSection } from '../ItemSection';
import { TaskRow } from '../rows/TaskRow';

export function TasksSection() {
  const tasks = useTaskItems();
  const ready = useItemsReady();
  const today = useCadenceToday();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Today and upcoming. Tasks from past days are locked history.
  const upcomingTasks = useMemo(
    () => tasks.filter((task) => task.scheduledDate >= today),
    [tasks, today],
  );

  return (
    <>
      <ItemsSection
        title="Tasks"
        description="Today and what's coming up."
        actionLabel="Add task"
        onAction={() => setDialogOpen(true)}
        actionDisabled={!ready}
        isLoading={!ready}
        isEmpty={upcomingTasks.length === 0}
        emptyMessage="Nothing scheduled. Add a task to plan your day."
      >
        {upcomingTasks.map((task) => (
          <TaskRow key={task.id} task={task} today={today} />
        ))}
      </ItemsSection>

      <AddTaskDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
