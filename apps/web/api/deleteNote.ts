'use client';

import type { apiResponse } from '@cadence/types';

import { apiRequest } from '@/lib/api/request';

export function deleteNote(noteId: string) {
  return apiRequest<apiResponse<{ noteId: string }>>(
    'DELETE',
    `/notes/${noteId}`,
  );
}
