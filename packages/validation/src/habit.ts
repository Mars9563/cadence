import * as z from 'zod';

import { dateSchema, uuidSchema } from './common';

/** ISO weekdays: 1 = Monday ... 7 = Sunday. Matches `items.recurrence_days`. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/**
 * A literal union rather than `z.number().int().min(1).max(7)`.
 *
 * The old schema inferred plain `number`, so the `Weekday` type in
 * `@cadence/types` (1 | 2 | ... | 7) was never enforced or even reachable from
 * validated input. This infers exactly `1 | 2 | 3 | 4 | 5 | 6 | 7`, which makes
 * `HabitRecurrenceInput['days']` assignable to `Weekday[] | null` with no casts.
 */
export const weekdaySchema = z.literal(WEEKDAYS, {
  error: 'Weekday must be 1 (Monday) to 7 (Sunday).',
});

export const recurrenceKindSchema = z.enum(['daily', 'weekly']);

export const habitRecurrenceSchema = z
  .object({
    kind: recurrenceKindSchema,

    days: z
      .array(weekdaySchema)
      .min(1, 'Select at least one day.')
      .max(7)
      .nullable(),

    startDate: dateSchema,

    endDate: dateSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'daily' && value.days !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['days'],
        message: 'Daily habits must not specify recurrence days.',
      });
    }

    if (value.kind === 'weekly' && value.days === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['days'],
        message: 'Weekly habits must specify at least one day.',
      });
    }

    if (value.endDate !== null && value.endDate < value.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date cannot be before start date.',
      });
    }

    // Mirrors items_habit_days_distinct (migration 001, section 3).
    if (value.days !== null) {
      const uniqueDays = new Set(value.days);

      if (uniqueDays.size !== value.days.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['days'],
          message: 'A weekday cannot be selected more than once.',
        });
      }
    }
  });

export const habitCompletionSchema = z.object({
  itemId: uuidSchema,
  occurrenceDate: dateSchema,
});

export type HabitRecurrenceInput = z.infer<typeof habitRecurrenceSchema>;

export type HabitCompletionInput = z.infer<typeof habitCompletionSchema>;
