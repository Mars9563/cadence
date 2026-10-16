'use client';

import { apiResponse, Folder } from '@cadence/types';
import { UpdateFolderInput } from '@cadence/validation';

import { getAccessToken } from '@/lib/supabase/accessToken';

/**
 * Rename (name) and/or move (parentId) a folder.
 */
export async function updateFolder(
  folderId: string,
  input: UpdateFolderInput,
): Promise<apiResponse<Folder>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/folders/${folderId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );

  const result: apiResponse<Folder> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to update folder');
  }

  return result;
}
