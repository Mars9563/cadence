import type { HabitItem } from '@cadence/types';

import {
  useCompleteItem,
  useHabitCompletions,
  useIsItemCompletionPending,
} from '@/store/selectors';

import { habitMeta } from '@/lib/itemFormat';
import { isHabitCompletedOnDate } from '@/lib/history';
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

  function handleCheckedChange(checked: boolean) {
    if (!checked || historyDate !== undefined) {
      return;
    }

    completeItem(habit.id);
  }

  return (
    <ItemRowLayout
      title={habit.title}
      description={habit.description}
      meta={habitMeta(habit, today)}
      checked={completed}
      loading={isPending}
      locked={locked}
      onCheckedChange={
        historyDate === undefined ? handleCheckedChange : undefined
      }
    />
  );
}
