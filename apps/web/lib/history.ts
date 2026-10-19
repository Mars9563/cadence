import type {
  HabitCompletion,
  HabitItem,
  NormalItem,
  TaskItem,
  Weekday,
} from '@cadence/types';

export type HistoryMetric = {
  completed: number;
  expected: number;
  score: number;
};

export type HistoryDayStats = {
  habit: HistoryMetric;
  task: HistoryMetric;
  normal: HistoryMetric;
};

export function cadenceDateToLocalDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function formatCadenceDate(date: string): string {
  return cadenceDateToLocalDate(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function localDateToCadenceDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function habitOccursOnDate(habit: HabitItem, date: string): boolean {
  if (date < habit.recurrenceStartDate) {
    return false;
  }

  if (habit.recurrenceEndDate !== null && date > habit.recurrenceEndDate) {
    return false;
  }

  if (habit.recurrenceKind === 'daily') {
    return true;
  }

  const weekday = cadenceDateToLocalDate(date).getDay();

  const isoWeekday: Weekday = weekday === 0 ? 7 : (weekday as Weekday);

  return habit.recurrenceDays?.includes(isoWeekday) ?? false;
}

export function isHabitCompletedOnDate(
  itemId: string,
  date: string,
  completions: HabitCompletion[],
): boolean {
  return completions.some(
    (completion) =>
      completion.itemId === itemId && completion.occurrenceDate === date,
  );
}

/**
 * A normal item counts on the Cadence date it was completed on, which the
 * database freezes at completion (completedOn), so a later time zone change
 * can't move it to another day.
 */
export function isNormalCompletedOnDate(item: NormalItem, date: string): boolean {
  return item.completedAt !== null && item.completedOn === date;
}

export function getHistoryDayStats(
  date: string,
  normalItems: NormalItem[],
  taskItems: TaskItem[],
  habitItems: HabitItem[],
  habitCompletions: HabitCompletion[],
  maxNormalCompletions: number,
): HistoryDayStats {
  const expectedHabits = habitItems.filter((habit) =>
    habitOccursOnDate(habit, date),
  );

  const completedHabits = expectedHabits.filter((habit) =>
    isHabitCompletedOnDate(habit.id, date, habitCompletions),
  ).length;

  const scheduledTasks = taskItems.filter(
    (task) => task.scheduledDate === date,
  );

  const completedTasks = scheduledTasks.filter(
    (task) => task.completedAt !== null,
  ).length;

  const completedNormals = normalItems.filter((item) =>
    isNormalCompletedOnDate(item, date),
  ).length;

  return {
    habit: {
      completed: completedHabits,
      expected: expectedHabits.length,
      score:
        expectedHabits.length === 0
          ? 0
          : completedHabits / expectedHabits.length,
    },

    task: {
      completed: completedTasks,
      expected: scheduledTasks.length,
      score:
        scheduledTasks.length === 0
          ? 0
          : completedTasks / scheduledTasks.length,
    },

    normal: {
      completed: completedNormals,
      expected: maxNormalCompletions,
      score:
        maxNormalCompletions === 0
          ? 0
          : Math.min(completedNormals / maxNormalCompletions, 1),
    },
  };
}

export function getMaxNormalCompletions(normalItems: NormalItem[]): number {
  const counts = new Map<string, number>();

  for (const item of normalItems) {
    if (item.completedAt === null || item.completedOn === null) {
      continue;
    }

    counts.set(item.completedOn, (counts.get(item.completedOn) ?? 0) + 1);
  }

  return Math.max(0, ...counts.values());
}
