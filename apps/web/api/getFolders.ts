'use client';

import type { Folder, apiResponse } from '@cadence/types';

import { apiRequest } from '@/lib/api/request';

export function getFolders() {
  return apiRequest<apiResponse<Folder[]>>('GET', '/folders/get');
}
