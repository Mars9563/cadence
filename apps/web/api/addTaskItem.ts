'use client';

import { getAccessToken } from '@/lib/supabase/accessToken';
import { TaskItem } from '@cadence/types';
import { apiResponse } from '@cadence/types';
import { CreateTaskItemInput } from '@cadence/validation';

export async function addTaskItem(
  input: CreateTaskItemInput,
): Promise<apiResponse<TaskItem>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/items/add/task`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );

  const result: apiResponse<TaskItem> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to add task item');
  }

  return result;
}
