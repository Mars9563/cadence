import type { NormalItem } from '@cadence/types';

import {
  useCompleteItem,
  useDayEndTime,
  useIsItemCompletionPending,
} from '@/store/selectors';

import { isNormalCompletedOnDate } from '@/lib/history';
import { ItemRowLayout } from './ItemRowLayout';

export function NormalItemRow({
  item,
  historyDate,
}: {
  item: NormalItem;
  historyDate?: string;
}) {
  const completeItem = useCompleteItem();

  const dayEndTime = useDayEndTime();

  const isPending = useIsItemCompletionPending(item.id);

  const completed =
    historyDate === undefined
      ? item.completedAt !== null
      : isNormalCompletedOnDate(item, historyDate, dayEndTime);

  function handleCheckedChange(checked: boolean) {
    if (!checked || historyDate !== undefined) {
      return;
    }

    completeItem(item.id);
  }

  return (
    <ItemRowLayout
      title={item.title}
      description={item.description}
      checked={completed}
      loading={isPending}
      onCheckedChange={
        historyDate === undefined ? handleCheckedChange : undefined
      }
    />
  );
}
