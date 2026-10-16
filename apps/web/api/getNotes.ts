'use client';

import { apiResponse, NoteSummary } from '@cadence/types';

import { getAccessToken } from '@/lib/supabase/accessToken';

/**
 * Note summaries only (no content). A note's content is fetched
 * separately when it is opened.
 */
export async function getNotes(): Promise<apiResponse<NoteSummary[]>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes/get`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: apiResponse<NoteSummary[]> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to fetch notes');
  }

  return result;
}
