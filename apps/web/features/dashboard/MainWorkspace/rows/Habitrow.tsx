import type { HabitItem } from '@cadence/types';

import {
  useCompleteItem,
  useHabitCompletions,
  useIsItemCompletionPending,
} from '@/store/selectors';

import { habitMeta } from '@/lib/itemFormat';
import { habitOccursOnDate, isHabitCompletedOnDate } from '@/lib/history';
import { ItemRowLayout } from './ItemRowLayout';

export function HabitRow({
  habit,
  today,
  historyDate,
}: {
  habit: HabitItem;
  today: string;
  historyDate?: string;
}) {
  const completeItem = useCompleteItem();

  const habitCompletions = useHabitCompletions();

  const isPending = useIsItemCompletionPending(habit.id);

  const viewDate = historyDate ?? today;

  const completed = isHabitCompletedOnDate(
    habit.id,
    viewDate,
    habitCompletions,
  );

  const locked = historyDate !== undefined && !completed;

  /*
   * The database only accepts a completion for TODAY's occurrence of the
   * habit (habit_completions_insert_own + habit_occurs_on): a weekly habit
   * on one of its off days, or one that has not started yet, cannot be
   * ticked. It used to look tickable and then fail silently.
   */
  const dueToday = habitOccursOnDate(habit, today);

  const canComplete = historyDate === undefined && dueToday && !completed;

  function handleCheckedChange(checked: boolean) {
    if (!checked || !canComplete) {
      return;
    }

    completeItem(habit.id);
  }

  return (
    <ItemRowLayout
      title={habit.title}
      description={habit.description}
      meta={
        historyDate === undefined &&
        !dueToday &&
        habit.recurrenceStartDate <= today
          ? ['Not today', ...habitMeta(habit, today)]
          : habitMeta(habit, today)
      }
      checked={completed}
      loading={isPending}
      locked={locked}
      disabledReason={
        historyDate === undefined && !dueToday
          ? habit.recurrenceStartDate > today
            ? 'Starts on a later day'
            : 'Not scheduled for today'
          : undefined
      }
      onCheckedChange={canComplete ? handleCheckedChange : undefined}
    />
  );
}
