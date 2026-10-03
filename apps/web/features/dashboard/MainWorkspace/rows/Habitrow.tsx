import type { HabitItem } from '@cadence/types';

import { habitMeta } from '@/lib/itemFormat';
import { ItemRowLayout } from './ItemRowLayout';

export function HabitRow({
  habit,
  today,
}: {
  habit: HabitItem;
  today: string;
}) {
  return (
    <ItemRowLayout
      title={habit.title}
      description={habit.description}
      meta={habitMeta(habit, today)}
    />
  );
}
