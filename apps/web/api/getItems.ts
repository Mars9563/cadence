'use client';

import { getAccessToken } from '@/lib/supabase/accessToken';
import { HabitItem, NormalItem, TaskItem } from '@cadence/types';
import { apiResponse } from '@cadence/types';

export type GetItemsResponse = {
  normalItems: NormalItem[];
  taskItems: TaskItem[];
  habitItems: HabitItem[];
};

export async function getItems(): Promise<apiResponse<GetItemsResponse>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/items/get`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: apiResponse<GetItemsResponse> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to fetch items');
  }

  return result;
}
