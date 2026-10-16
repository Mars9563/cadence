'use client';

import { apiResponse, NoteSummary } from '@cadence/types';
import { UpdateNoteInput } from '@cadence/validation';

import { getAccessToken } from '@/lib/supabase/accessToken';

/**
 * Rename (title) and/or move (folderId) a note.
 *
 * Content is not accepted here; content saves go through the socket.
 */
export type UpdateNoteDetailsInput = Omit<UpdateNoteInput, 'content'>;

export async function updateNote(
  noteId: string,
  input: UpdateNoteDetailsInput,
): Promise<apiResponse<NoteSummary>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes/${noteId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );

  const result: apiResponse<NoteSummary> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to update note');
  }

  return result;
}
