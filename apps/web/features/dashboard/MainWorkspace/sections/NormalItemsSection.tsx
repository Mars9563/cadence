'use client';

import { useState } from 'react';

import { useItemsReady, useNormalItems } from '@/store/selectors';
import { AddNormalItemDialog } from '../dialogs/AddNormalItemDialog';
import { ItemsSection } from '../ItemSection';
import { NormalItemRow } from '../rows/Normalitemrow';

export function NormalItemsSection() {
  const items = useNormalItems();
  const ready = useItemsReady();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <ItemsSection
        title="Normal items"
        description="Stuff to handle. No date, no pressure."
        actionLabel="Add item"
        onAction={() => setDialogOpen(true)}
        actionDisabled={!ready}
        isLoading={!ready}
        isEmpty={items.length === 0}
        emptyMessage="Nothing here. Add anything that doesn't need a date."
      >
        {items.map((item) => (
          <NormalItemRow key={item.id} item={item} />
        ))}
      </ItemsSection>

      <AddNormalItemDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
