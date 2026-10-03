'use client';

import { getAccessToken } from '@/lib/supabase/accessToken';
import { NormalItem } from '@cadence/types';
import { apiResponse } from '@cadence/types';
import { CreateNormalItemInput } from '@cadence/validation';

export async function addNormalItem(
  input: CreateNormalItemInput,
): Promise<apiResponse<NormalItem>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/items/add/normal`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );

  const result: apiResponse<NormalItem> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? 'Failed to add normal item');
  }

  return result;
}
