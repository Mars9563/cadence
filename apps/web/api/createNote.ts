'use client';

import type { Note, apiResponse } from '@cadence/types';
import type { CreateNoteInput } from '@cadence/validation';

import { apiRequest } from '@/lib/api/request';

export function createNote(input: CreateNoteInput) {
  return apiRequest<apiResponse<Note>>('POST', '/notes/create', input);
}
