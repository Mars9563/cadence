import type { Profile } from '@cadence/types';

/**
 * True while a loaded profile hasn't finished first-time setup. Nothing that
 * is dated (e.g. today's daily note) may be created before then: it would be
 * dated with the default zone, and it would make setup schedule the user's
 * zone instead of applying it at once.
 */
export function needsOnboarding(profile: Pick<Profile, 'onboardedAt'> | null): boolean {
  return profile !== null && profile.onboardedAt === null;
}
