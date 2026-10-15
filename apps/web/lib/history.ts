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

function previousCalendarDate(date: Date): Date {
  const previous = new Date(date.getTime());

  previous.setUTCDate(previous.getUTCDate() - 1);

  return previous;
}

function parseTimeToSeconds(value: string): number {
  const [hours = '0', minutes = '0', seconds = '0'] = value.split(':');

  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

/**
 * Mirrors the database cadence_date_of() rule:
 *
 * 1. Convert the timestamp to Asia/Kolkata.
 * 2. Look at the local wall-clock time.
 * 3. If it is before the user's Cadence day boundary,
 *    the timestamp belongs to the previous Cadence date.
 */
const IST_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function getCadenceDateFromTimestamp(
  timestamp: string,
  dayEndTime: string,
): string {
  const parts = IST_DATE_TIME_FORMATTER.formatToParts(new Date(timestamp));

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;

  const localDate = new Date(
    Date.UTC(values.year, values.month - 1, values.day),
  );

  const localSeconds = values.hour * 3600 + values.minute * 60 + values.second;

  if (localSeconds < parseTimeToSeconds(dayEndTime)) {
    return localDateToUtcDateString(previousCalendarDate(localDate));
  }

  return localDateToUtcDateString(localDate);
}

function localDateToUtcDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

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

export function isNormalCompletedOnDate(
  item: NormalItem,
  date: string,
  dayEndTime: string,
): boolean {
  return (
    item.completedAt !== null &&
    getCadenceDateFromTimestamp(item.completedAt, dayEndTime) === date
  );
}

export function getHistoryDayStats(
  date: string,
  normalItems: NormalItem[],
  taskItems: TaskItem[],
  habitItems: HabitItem[],
  habitCompletions: HabitCompletion[],
  dayEndTime: string,
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
    isNormalCompletedOnDate(item, date, dayEndTime),
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

export function getMaxNormalCompletions(
  normalItems: NormalItem[],
  dayEndTime: string,
): number {
  const counts = new Map<string, number>();

  for (const item of normalItems) {
    if (item.completedAt === null) {
      continue;
    }

    const date = getCadenceDateFromTimestamp(item.completedAt, dayEndTime);

    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return Math.max(0, ...counts.values());
}
