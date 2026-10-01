import * as z from 'zod';

import { dateSchema, titleSchema, uuidSchema } from './common';

/* ============================================================================
 * DAILY NOTES
 * ========================================================================== */

export const createDailyNoteSchema = z.object({
  noteDate: dateSchema,

  content: z.string().max(500_000, 'Daily note is too large.'),
});

export const updateDailyNoteSchema = z.object({
  content: z.string().max(500_000, 'Daily note is too large.'),
});

export const dailyNoteDateParamsSchema = z.object({
  date: dateSchema,
});

export const dailyNoteIdParamsSchema = z.object({
  id: uuidSchema,
});

/* ============================================================================
 * GENERAL NOTES
 * ========================================================================== */

export const createNoteSchema = z.object({
  folderId: uuidSchema,

  title: titleSchema,

  content: z.string().max(1_000_000, 'Note is too large.'),
});

export const updateNoteSchema = z.object({
  title: titleSchema.optional(),

  content: z.string().max(1_000_000, 'Note is too large.').optional(),

  folderId: uuidSchema.optional(),
});

export const noteIdParamsSchema = z.object({
  id: uuidSchema,
});

export type CreateDailyNoteInput = z.infer<typeof createDailyNoteSchema>;

export type UpdateDailyNoteInput = z.infer<typeof updateDailyNoteSchema>;

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
