import * as z from 'zod';

import {
  dateSchema,
  descriptionSchema,
  timeSchema,
  titleSchema,
  uuidSchema,
} from './common';

import { habitRecurrenceSchema } from './habit';

const baseItemFields = {
  title: titleSchema,
  description: descriptionSchema,
};

/**
 * Optional client-generated id for creates.
 *
 * The web client creates rows optimistically (and while offline) under an id
 * it generated itself, then replays the request until the server confirms.
 * Sending the same id again is idempotent: the server returns the existing
 * row instead of inserting a duplicate.
 */
const clientIdField = {
  id: uuidSchema.optional(),
};

/* ============================================================================
 * CREATE
 * ========================================================================== */

export const createNormalItemSchema = z.object({
  kind: z.literal('normal'),

  ...clientIdField,

  ...baseItemFields,
});

export const createTaskItemSchema = z.object({
  kind: z.literal('task'),

  ...clientIdField,

  ...baseItemFields,

  scheduledDate: dateSchema,

  scheduledTime: timeSchema.nullable().optional(),
});

export const createHabitItemSchema = z.object({
  kind: z.literal('habit'),

  ...clientIdField,

  ...baseItemFields,

  scheduledTime: timeSchema.nullable().optional(),

  recurrence: habitRecurrenceSchema,
});

export const createItemSchema = z.discriminatedUnion('kind', [
  createNormalItemSchema,
  createTaskItemSchema,
  createHabitItemSchema,
]);

/* ============================================================================
 * UPDATE
 * ========================================================================== */

export const updateNormalItemSchema = z.object({
  kind: z.literal('normal'),

  title: titleSchema.optional(),

  description: descriptionSchema,

  completed: z.boolean().optional(),
});

export const updateTaskItemSchema = z.object({
  kind: z.literal('task'),

  title: titleSchema.optional(),

  description: descriptionSchema,

  scheduledDate: dateSchema.optional(),

  scheduledTime: timeSchema.nullable().optional(),

  completed: z.boolean().optional(),
});

export const updateHabitItemSchema = z.object({
  kind: z.literal('habit'),

  title: titleSchema.optional(),

  description: descriptionSchema,

  scheduledTime: timeSchema.nullable().optional(),

  recurrence: habitRecurrenceSchema.optional(),
});

export const updateItemSchema = z.discriminatedUnion('kind', [
  updateNormalItemSchema,
  updateTaskItemSchema,
  updateHabitItemSchema,
]);

/* ============================================================================
 * ROUTE PARAMS
 * ========================================================================== */

export const itemIdParamsSchema = z.object({
  id: uuidSchema,
});

/* ============================================================================
 * TYPES
 * ========================================================================== */

export type CreateNormalItemInput = z.infer<typeof createNormalItemSchema>;

export type CreateTaskItemInput = z.infer<typeof createTaskItemSchema>;

export type CreateHabitItemInput = z.infer<typeof createHabitItemSchema>;

export type CreateItemInput = z.infer<typeof createItemSchema>;

export type UpdateItemInput = z.infer<typeof updateItemSchema>;
