'use client';

import { apiResponse, DailyNote } from '@cadence/types';

import { getAccessToken } from '@/lib/supabase/accessToken';

export async function createDailyNote(): Promise<
  apiResponse<{ dailyNote: DailyNote }>
> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/daily-notes/create`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: apiResponse<{ dailyNote: DailyNote }> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to create daily note');
  }

  return result;
}
