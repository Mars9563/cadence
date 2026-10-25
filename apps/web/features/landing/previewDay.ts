/** Sample day for the landing page preview. Nothing here is saved anywhere. */

export type PreviewKind = 'habit' | 'task' | 'todo';

export type PreviewItem = {
  id: string;
  kind: PreviewKind;
  title: string;
  /** Small detail on the right: a time, or how often. */
  meta?: string;
  done: boolean;
};

export const KIND_LABELS: Record<PreviewKind, string> = {
  habit: 'Habits',
  task: 'Tasks',
  todo: 'To-dos',
};

export const TODAY_ITEMS: PreviewItem[] = [
  { id: 'h-stretch', kind: 'habit', title: 'Stretch', meta: 'Every day', done: true },
  { id: 'h-read', kind: 'habit', title: 'Read for 20 minutes', meta: 'Every day', done: false },
  { id: 'h-run', kind: 'habit', title: 'Run', meta: 'Mon · Wed · Fri', done: false },
  { id: 't-report', kind: 'task', title: 'Send the weekly report', meta: '11:00', done: false },
  { id: 't-dentist', kind: 'task', title: 'Book the dentist', done: false },
  { id: 'd-plants', kind: 'todo', title: 'Water the plants', done: true },
  { id: 'd-reply', kind: 'todo', title: 'Reply to Asha', done: false },
];

export const YESTERDAY_ITEMS: PreviewItem[] = [
  { id: 'y-stretch', kind: 'habit', title: 'Stretch', meta: 'Every day', done: true },
  { id: 'y-read', kind: 'habit', title: 'Read for 20 minutes', meta: 'Every day', done: false },
  { id: 'y-call', kind: 'task', title: 'Call the bank', meta: '16:30', done: true },
  { id: 'y-groceries', kind: 'todo', title: 'Buy groceries', done: true },
];

export function toggleItem(items: PreviewItem[], id: string): PreviewItem[] {
  return items.map((item) => (item.id === id ? { ...item, done: !item.done } : item));
}

export function progressOf(items: PreviewItem[]): { done: number; total: number } {
  return { done: items.filter((item) => item.done).length, total: items.length };
}
