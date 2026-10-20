'use client';

import { ApiError, BACKEND_URL, apiRequest } from '@/lib/api/request';
import { getAccessToken } from '@/lib/supabase/accessToken';

/** Download the ZIP of all the user's data (built by the server). */
export async function downloadExport(): Promise<void> {
  const token = await getAccessToken();

  if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has ended.');

  let response: Response;

  try {
    response = await fetch(`${BACKEND_URL}/account/export`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cadence could not be reached.');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ApiError(response.status, body.error ?? `HTTP_${response.status}`, body.message);
  }

  const fileName =
    /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ??
    'cadence-export.zip';

  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });

  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Permanently delete the account (the server checks the confirmation too). */
export async function deleteAccount(): Promise<void> {
  await apiRequest<{ success: boolean }>('DELETE', '/account', { confirm: 'DELETE' });
}
