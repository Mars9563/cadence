import * as z from 'zod';

import { titleSchema, uuidSchema } from './common';

export const createFolderSchema = z.object({
  /** Optional client-generated id; replaying a create is idempotent. */
  id: uuidSchema.optional(),

  name: titleSchema,

  parentId: uuidSchema,
});

export const updateFolderSchema = z.object({
  name: titleSchema.optional(),

  parentId: uuidSchema.optional(),
});

export const folderIdParamsSchema = z.object({
  id: uuidSchema,
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
