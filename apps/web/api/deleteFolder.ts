'use client';

import type { apiResponse } from '@cadence/types';

import { apiRequest } from '@/lib/api/request';

export function deleteFolder(folderId: string) {
  return apiRequest<apiResponse<{ folderId: string }>>(
    'DELETE',
    `/folders/${folderId}`,
  );
}
