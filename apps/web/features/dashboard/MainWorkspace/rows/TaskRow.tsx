import type { TaskItem } from '@cadence/types';

import { useCompleteItem, useIsItemCompletionPending } from '@/store/selectors';

import { taskMeta } from '@/lib/itemFormat';
import { ItemRowLayout } from './ItemRowLayout';

export function TaskRow({
  task,
  today,
  historyDate,
}: {
  task: TaskItem;
  today: string;
  historyDate?: string;
}) {
  const completeItem = useCompleteItem();

  const isPending = useIsItemCompletionPending(task.id);

  const completed = task.completedAt !== null;

  /*
   * Future tasks are visible in the task list,
   * but they must not be completable yet.
   *
   * We compare Cadence dates, not JavaScript timestamps,
   * because task.scheduledDate is a Cadence date.
   */
  const isFuture = task.scheduledDate > today;

  /*
   * Historical incomplete tasks are also locked.
   *
   * Historical completed tasks remain checked and visible.
   */
  const isHistoryIncomplete = historyDate !== undefined && !completed;

  const locked = isFuture || isHistoryIncomplete;

  function handleCheckedChange(checked: boolean) {
    /*
     * Only a transition to checked is a completion request.
     *
     * We also protect this handler itself against:
     * - historical views
     * - future tasks
     *
     * The UI should already prevent these cases, but keeping
     * the guard here makes the row safe if its props change.
     */
    if (!checked || historyDate !== undefined || isFuture) {
      return;
    }

    completeItem(task.id);
  }

  return (
    <ItemRowLayout
      title={task.title}
      description={task.description}
      meta={taskMeta(task, today)}
      checked={completed}
      loading={isPending}
      locked={locked}
      onCheckedChange={
        historyDate === undefined && !isFuture ? handleCheckedChange : undefined
      }
    />
  );
}
