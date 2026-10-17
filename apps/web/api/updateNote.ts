'use client';

import type { NoteSummary, apiResponse } from '@cadence/types';
import type { UpdateNoteInput } from '@cadence/validation';

import { apiRequest } from '@/lib/api/request';

/**
 * Rename (title) and/or move (folderId) a note.
 *
 * Content is not accepted here; content saves go through the socket.
 */
export type UpdateNoteDetailsInput = Omit<UpdateNoteInput, 'content'>;

export function updateNote(noteId: string, input: UpdateNoteDetailsInput) {
  return apiRequest<apiResponse<NoteSummary>>(
    'PATCH',
    `/notes/${noteId}`,
    input,
  );
}
