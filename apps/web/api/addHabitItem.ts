'use client';

import type { HabitItem, apiResponse } from '@cadence/types';
import type { CreateHabitItemInput } from '@cadence/validation';

import { apiRequest } from '@/lib/api/request';

export function addHabitItem(input: CreateHabitItemInput) {
  return apiRequest<apiResponse<HabitItem>>('POST', '/items/add/habit', input);
}
