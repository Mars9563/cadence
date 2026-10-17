'use client';

import type { Folder, apiResponse } from '@cadence/types';
import type { CreateFolderInput } from '@cadence/validation';

import { apiRequest } from '@/lib/api/request';

export function createFolder(input: CreateFolderInput) {
  return apiRequest<apiResponse<Folder>>('POST', '/folders/create', input);
}
