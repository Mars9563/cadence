import type { HabitItem, TaskItem, Weekday } from '@cadence/types';

import { addDays } from './cadenceDate';

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

/** 'HH:MM:SS' (what Postgres returns) -> 'HH:MM'. */
export function formatTime(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

function utcDate(date: string): Date {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** 'Sep 12' (adds the year only when it differs from today's year). */
export function formatShortDate(date: string, today: string): string {
  const sameYear = date.slice(0, 4) === today.slice(0, 4);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(utcDate(date));
}

/** 'Today' | 'Tomorrow' | 'Sat, Sep 12' */
export function formatRelativeDay(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';

  const sameYear = date.slice(0, 4) === today.slice(0, 4);

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(utcDate(date));
}

function sameDays(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** 'Daily' | 'Weekdays' | 'Weekends' | 'Mon Wed Fri' */
export function formatRecurrence(
  kind: 'daily' | 'weekly',
  days: Weekday[] | null,
): string {
  if (kind === 'daily' || days === null) return 'Daily';

  const sorted = [...new Set(days)].sort((a, b) => a - b);

  if (sorted.length === 7) return 'Daily';
  if (sameDays(sorted, [1, 2, 3, 4, 5])) return 'Weekdays';
  if (sameDays(sorted, [6, 7])) return 'Weekends';

  return sorted.map((day) => WEEKDAY_SHORT[day]).join(' ');
}

/** Right-hand metadata for a habit row. */
export function habitMeta(habit: HabitItem, today: string): string[] {
  const meta: string[] = [];

  if (habit.recurrenceStartDate > today) {
    meta.push(`Starts ${formatShortDate(habit.recurrenceStartDate, today)}`);
  }

  meta.push(formatRecurrence(habit.recurrenceKind, habit.recurrenceDays));

  const time = formatTime(habit.scheduledTime);
  if (time) meta.push(time);

  if (habit.recurrenceEndDate) {
    meta.push(`Until ${formatShortDate(habit.recurrenceEndDate, today)}`);
  }

  return meta;
}

/** Right-hand metadata for a task row. */
export function taskMeta(task: TaskItem, today: string): string[] {
  const meta = [formatRelativeDay(task.scheduledDate, today)];

  const time = formatTime(task.scheduledTime);
  if (time) meta.push(time);

  return meta;
}
