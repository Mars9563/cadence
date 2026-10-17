'use client';

import type { TaskItem, apiResponse } from '@cadence/types';
import type { CreateTaskItemInput } from '@cadence/validation';

import { apiRequest } from '@/lib/api/request';

export function addTaskItem(input: CreateTaskItemInput) {
  return apiRequest<apiResponse<TaskItem>>('POST', '/items/add/task', input);
}
