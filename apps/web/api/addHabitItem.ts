'use client';

import { getAccessToken } from '@/lib/supabase/accessToken';
import { HabitItem } from '@cadence/types';
import { apiResponse } from '@cadence/types';
import { CreateHabitItemInput } from '@cadence/validation';

export async function addHabitItem(
  input: CreateHabitItemInput,
): Promise<apiResponse<HabitItem>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/items/add/habit`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );

  const result: apiResponse<HabitItem> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to add habit item');
  }

  return result;
}
