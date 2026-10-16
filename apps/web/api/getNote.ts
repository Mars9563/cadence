'use client';

import { apiResponse, Note } from '@cadence/types';

import { getAccessToken } from '@/lib/supabase/accessToken';

/**
 * One note WITH its Markdown content (the list endpoint omits content).
 */
export async function getNote(noteId: string): Promise<apiResponse<Note>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes/${noteId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: apiResponse<Note> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to fetch note');
  }

  return result;
}
