'use client';

import type { Profile } from '@cadence/types';

import { apiRequest } from '@/lib/api/request';

/** The signed-in user's profile (returned bare, not wrapped). */
export function getProfile() {
  return apiRequest<Profile>('GET', '/profile');
}
