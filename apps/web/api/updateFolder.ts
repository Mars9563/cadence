'use client';

import type { Folder, apiResponse } from '@cadence/types';
import type { UpdateFolderInput } from '@cadence/validation';

import { apiRequest } from '@/lib/api/request';

/** Rename (name) and/or move (parentId) a folder. */
export function updateFolder(folderId: string, input: UpdateFolderInput) {
  return apiRequest<apiResponse<Folder>>(
    'PATCH',
    `/folders/${folderId}`,
    input,
  );
}
