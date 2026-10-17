'use client';

import type { DailyNote, apiResponse } from '@cadence/types';

import { apiRequest } from '@/lib/api/request';

export function getDailyNotes() {
  return apiRequest<apiResponse<{ dailyNotes: DailyNote[] }>>(
    'GET',
    '/daily-notes/get',
  );
}
