'use client';

import type { HabitCompletion, apiResponse } from '@cadence/types';

import { apiRequest } from '@/lib/api/request';

export function getHabitCompletions() {
  return apiRequest<apiResponse<HabitCompletion[]>>(
    'GET',
    '/habit-completions/get',
  );
}
