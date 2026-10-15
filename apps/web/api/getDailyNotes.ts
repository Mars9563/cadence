'use client';

import { apiResponse, DailyNote } from '@cadence/types';

import { getAccessToken } from '@/lib/supabase/accessToken';

export type GetDailyNotesResponse = {
  dailyNotes: DailyNote[];
};

export async function getDailyNotes(): Promise<
  apiResponse<GetDailyNotesResponse>
> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/daily-notes/get`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: apiResponse<GetDailyNotesResponse> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to fetch daily notes');
  }

  return result;
}
