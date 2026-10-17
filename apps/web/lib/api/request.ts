import type { apiResponse } from '@cadence/types';

import { getAccessToken } from '@/lib/supabase/accessToken';

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

/**
 * A failed API call, classified so callers (and the sync queue) know whether
 * trying again later can help.
 *
 * - `status` is the HTTP status, or 0 when the request never got an answer
 *   (offline, server down, CORS, timeout).
 * - `code` is the backend's machine code ('NOTE_NOT_FOUND', 'ITEM_LOCKED',
 *   ...) or one of ours ('NETWORK_ERROR', 'UNAUTHENTICATED').
 * - `retryable`: the same request may succeed later without changes
 *   (network, 5xx, 408/429, an expired session that may refresh). Anything
 *   else (validation, not found, locked, conflict) will fail the same way
 *   again and must not be retried forever.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;

  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryable =
      status === 0 ||
      status === 401 ||
      status === 408 ||
      status === 429 ||
      status >= 500;
  }
}

/** True for errors worth retrying later (network, 5xx, expired session). */
export function isRetryableError(error: unknown): boolean {
  return error instanceof ApiError ? error.retryable : true;
}

/** The backend/sync error code of an unknown error, if it has one. */
export function errorCodeOf(error: unknown): string | undefined {
  if (error instanceof ApiError) return error.code;
  if (error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)) {
    return error.message;
  }
  return undefined;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Authenticated JSON request to the Cadence backend.
 *
 * Throws ApiError for every failure. The backend answers errors as
 * `{ error: CODE, message }`, successes as `{ success: true, data }`.
 */
export async function apiRequest<T>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getAccessToken();

  if (!token) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has ended.');
  }

  let response: Response;

  try {
    response = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cadence could not be reached.');
  }

  let json: unknown = null;

  try {
    json = await response.json();
  } catch {
    // Empty or non-JSON body; handled below.
  }

  const result = (json ?? {}) as Partial<apiResponse<unknown>> & {
    message?: string;
  };

  if (!response.ok || result.success === false) {
    throw new ApiError(
      response.status,
      result.error ?? `HTTP_${response.status}`,
      result.message,
    );
  }

  return json as T;
}
