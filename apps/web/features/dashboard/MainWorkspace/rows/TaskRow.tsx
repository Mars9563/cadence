import type { TaskItem } from '@cadence/types';

import { taskMeta } from '@/lib/itemFormat';
import { ItemRowLayout } from './ItemRowLayout';

export function TaskRow({ task, today }: { task: TaskItem; today: string }) {
  return (
    <ItemRowLayout
      title={task.title}
      description={task.description}
      meta={taskMeta(task, today)}
      checked={task.completedAt !== null}
    />
  );
}
