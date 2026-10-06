'use client';

import { useMemo, useState } from 'react';

import { useCadenceToday } from '@/hooks/useCadenceToday';

import { formatCadenceDate, isNormalCompletedOnDate } from '@/lib/history';

import {
  useDayEndTime,
  useItemsReady,
  useNormalItems,
  useSelectedDate,
} from '@/store/selectors';

import { AddNormalItemDialog } from '../dialogs/AddNormalItemDialog';
import { ItemsSection } from '../ItemSection';
import { NormalItemRow } from '../rows/Normalitemrow';

export function NormalItemsSection() {
  const items = useNormalItems();

  const ready = useItemsReady();

  const today = useCadenceToday();

  const selectedDate = useSelectedDate();

  const dayEndTime = useDayEndTime();

  const [dialogOpen, setDialogOpen] = useState(false);

  const historyDate =
    selectedDate !== null && selectedDate < today ? selectedDate : undefined;

  const visibleItems = useMemo(() => {
    if (historyDate !== undefined) {
      /*
       * Normal items have no scheduled date.
       *
       * They only enter history when their
       * completion timestamp belongs to the
       * selected Cadence day.
       */
      return items.filter((item) =>
        isNormalCompletedOnDate(item, historyDate, dayEndTime),
      );
    }

    return items;
  }, [dayEndTime, historyDate, items]);

  return (
    <>
      <ItemsSection
        title="Normal items"
        description={
          historyDate === undefined
            ? 'Stuff to handle. No date, no pressure.'
            : `Completed normal items for ${formatCadenceDate(historyDate)}.`
        }
        actionLabel="Add item"
        onAction={() => setDialogOpen(true)}
        actionDisabled={!ready || historyDate !== undefined}
        showAction={historyDate === undefined}
        isLoading={!ready}
        isEmpty={visibleItems.length === 0}
        emptyMessage={
          historyDate === undefined
            ? "Nothing here. Add anything that doesn't need a date."
            : 'No normal items were completed on this day.'
        }
      >
        {visibleItems.map((item) => (
          <NormalItemRow key={item.id} item={item} historyDate={historyDate} />
        ))}
      </ItemsSection>

      <AddNormalItemDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
