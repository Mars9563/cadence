'use client';

import type { DailyNote, apiResponse } from '@cadence/types';

import { apiRequest } from '@/lib/api/request';

/**
 * Make sure today's Daily Note exists. The server picks the date (app_today)
 * and returns the existing note when there already is one; `id` is only the
 * id the client already uses locally, which the server adopts if it creates.
 */
export function createDailyNote(id?: string) {
  return apiRequest<apiResponse<{ dailyNote: DailyNote }>>(
    'POST',
    '/daily-notes/create',
    id ? { id } : {},
  );
}
