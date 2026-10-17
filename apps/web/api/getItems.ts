'use client';

import type { HabitItem, NormalItem, TaskItem, apiResponse } from '@cadence/types';

import { apiRequest } from '@/lib/api/request';

export type GetItemsResponse = {
  normalItems: NormalItem[];
  taskItems: TaskItem[];
  habitItems: HabitItem[];
};

export function getItems() {
  return apiRequest<apiResponse<GetItemsResponse>>('GET', '/items/get');
}
