'use client';

import type { NormalItem, apiResponse } from '@cadence/types';
import type { CreateNormalItemInput } from '@cadence/validation';

import { apiRequest } from '@/lib/api/request';

export function addNormalItem(input: CreateNormalItemInput) {
  return apiRequest<apiResponse<NormalItem>>('POST', '/items/add/normal', input);
}
