'use client';

import { apiResponse, Note } from '@cadence/types';
import { CreateNoteInput } from '@cadence/validation';

import { getAccessToken } from '@/lib/supabase/accessToken';

export async function createNote(
  input: CreateNoteInput,
): Promise<apiResponse<Note>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes/create`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );

  const result: apiResponse<Note> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to create note');
  }

  return result;
}
