import type { Draft, PersistedSync, SyncOp } from './types';

/*
 * Durable storage for the outbox and drafts, one entry per user.
 *
 * localStorage is synchronous, which is exactly what is needed for the
 * "page is closing" path: a draft written in a pagehide handler is on disk
 * before the page goes away. Writes that fail (quota, private mode) leave
 * the in-memory copy intact and are reported, so the session keeps working
 * and the user can be warned.
 */

const keyFor = (userId: string) => `cadence:sync:v1:${userId}`;

const EMPTY: PersistedSync = { version: 1, outbox: [], drafts: {} };

export function readPersistedSync(userId: string): PersistedSync {
  try {
    const raw = window.localStorage.getItem(keyFor(userId));

    if (!raw) return EMPTY;

    const parsed = JSON.parse(raw) as Partial<PersistedSync>;

    if (parsed.version !== 1) return EMPTY;

    return {
      version: 1,
      outbox: Array.isArray(parsed.outbox) ? parsed.outbox : [],
      drafts:
        parsed.drafts && typeof parsed.drafts === 'object' ? parsed.drafts : {},
    };
  } catch {
    return EMPTY;
  }
}

/** Returns false when the browser refused the write. */
export function writePersistedSync(
  userId: string,
  outbox: SyncOp[],
  drafts: Record<string, Draft>,
): boolean {
  try {
    const key = keyFor(userId);

    if (outbox.length === 0 && Object.keys(drafts).length === 0) {
      window.localStorage.removeItem(key);
    } else {
      const value: PersistedSync = { version: 1, outbox, drafts };
      window.localStorage.setItem(key, JSON.stringify(value));
    }

    return true;
  } catch {
    return false;
  }
}

/** Unsynced change count for a user who is not loaded (sign-out warning). */
export function countPersistedChanges(userId: string): number {
  const { outbox, drafts } = readPersistedSync(userId);

  return outbox.length + Object.keys(drafts).length;
}
