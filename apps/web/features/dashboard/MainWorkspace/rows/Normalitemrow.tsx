import type { NormalItem } from '@cadence/types';

import { ItemRowLayout } from './ItemRowLayout';

export function NormalItemRow({ item }: { item: NormalItem }) {
  return (
    <ItemRowLayout
      title={item.title}
      description={item.description}
      checked={item.completedAt !== null}
    />
  );
}
