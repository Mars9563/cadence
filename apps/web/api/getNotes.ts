'use client';

import type { NoteSummary, apiResponse } from '@cadence/types';

import { apiRequest } from '@/lib/api/request';

/** Every note WITHOUT content (the tree). Open one with getNote. */
export function getNotes() {
  return apiRequest<apiResponse<NoteSummary[]>>('GET', '/notes/get');
}
