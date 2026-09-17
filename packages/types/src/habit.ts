export type RecurrenceKind = 'daily' | 'weekly';

export type Weekday =
  | 1 // Monday
  | 2 // Tuesday
  | 3 // Wednesday
  | 4 // Thursday
  | 5 // Friday
  | 6 // Saturday
  | 7; // Sunday

export type HabitRecurrence = {
  kind: RecurrenceKind;
  days: Weekday[] | null;
  startDate: string;
  endDate: string | null;
};

export type HabitCompletion = {
  id: string;
  userId: string;
  itemId: string;
  occurrenceDate: string;
  completedAt: string;
};
