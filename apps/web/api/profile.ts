'use client';
import { getAccessToken } from '@/lib/supabase/accessToken';
import { Profile } from '@cadence/types';
import { error } from 'console';

export async function getProfile(): Promise<Profile> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not Authenticated');
  }
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/profile`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();

    console.error('PROFILE REQUEST FAILED', {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      body,
    });

    throw new Error(
      `Failed to fetch profile: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}
