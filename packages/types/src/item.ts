import { Weekday } from "./habit";

export type ItemKind = 'normal' | 'task' | 'habit';

export type BaseItem = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NormalItem = BaseItem & {
  kind: 'normal';

  /**
   * Normal items are unscheduled inbox-style tasks.
   * They have no date, time, or recurrence.
   *
   * They remain available until completed or deleted.
   */
  scheduledDate: null;
  scheduledTime: null;

  recurrenceKind: null;
  recurrenceDays: null;
  recurrenceStartDate: null;
  recurrenceEndDate: null;

  completedAt: string | null;

  /**
   * Cadence date the item was completed on, frozen by the database at
   * completion (a later time zone change can't move it).
   */
  completedOn: string | null;
};

export type TaskItem = BaseItem & {
  kind: 'task';

  /**
   * One-time scheduled task.
   * Date is required; time is optional.
   */
  scheduledDate: string;
  scheduledTime: string | null;

  recurrenceKind: null;
  recurrenceDays: null;
  recurrenceStartDate: null;
  recurrenceEndDate: null;

  completedAt: string | null;
  completedOn: null;
};

export type HabitItem = BaseItem & {
  kind: 'habit';

  /**
   * Recurring habit.
   * Habits do not use a one-off scheduled date or completedAt.
   */
  scheduledDate: null;
  scheduledTime: string | null;

  recurrenceKind: 'daily' | 'weekly';
  recurrenceDays: Weekday[] | null;
  recurrenceStartDate: string;
  recurrenceEndDate: string | null;

  completedAt: null;
  completedOn: null;
};

export type Item = NormalItem | TaskItem | HabitItem;

export type GetItemsResponse = {
  normalItems: NormalItem[];
  taskItems: TaskItem[];
  habitItems: HabitItem[];
};
