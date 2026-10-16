'use client';

import { apiResponse } from '@cadence/types';

import { getAccessToken } from '@/lib/supabase/accessToken';

export async function deleteFolder(
  folderId: string,
): Promise<apiResponse<{ folderId: string }>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/folders/${folderId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: apiResponse<{ folderId: string }> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to delete folder');
  }

  return result;
}
