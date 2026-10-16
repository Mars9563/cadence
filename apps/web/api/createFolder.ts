'use client';

import { apiResponse, Folder } from '@cadence/types';
import { CreateFolderInput } from '@cadence/validation';

import { getAccessToken } from '@/lib/supabase/accessToken';

export async function createFolder(
  input: CreateFolderInput,
): Promise<apiResponse<Folder>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/folders/create`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );

  const result: apiResponse<Folder> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to create folder');
  }

  return result;
}
