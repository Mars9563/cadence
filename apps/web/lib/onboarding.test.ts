import { describe, expect, it } from 'vitest';

import { needsOnboarding } from './onboarding';

describe('needsOnboarding', () => {
  it('is false until the profile has loaded', () => {
    expect(needsOnboarding(null)).toBe(false);
  });

  it('is true for a profile that has not finished setup', () => {
    expect(needsOnboarding({ onboardedAt: null })).toBe(true);
  });

  it('is false once setup is done', () => {
    expect(needsOnboarding({ onboardedAt: '2026-10-19T08:00:00Z' })).toBe(false);
  });
});
