'use client';

import type { Note, apiResponse } from '@cadence/types';

import { apiRequest } from '@/lib/api/request';

/** One note WITH its Markdown content (the list endpoint omits content). */
export function getNote(noteId: string) {
  return apiRequest<apiResponse<Note>>('GET', `/notes/${noteId}`);
}
