'use client';

import { getAccessToken } from '@/lib/supabase/accessToken';
import { HabitCompletion } from '@cadence/types';
import { apiResponse } from '@cadence/types';

export async function getHabitCompletions(): Promise<
  apiResponse<HabitCompletion[]>
> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/habit-completions/get`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: apiResponse<HabitCompletion[]> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to fetch habit completions');
  }

  return result;
}
