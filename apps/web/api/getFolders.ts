'use client';

import { apiResponse, Folder } from '@cadence/types';

import { getAccessToken } from '@/lib/supabase/accessToken';

export async function getFolders(): Promise<apiResponse<Folder[]>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/folders/get`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: apiResponse<Folder[]> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to fetch folders');
  }

  return result;
}
