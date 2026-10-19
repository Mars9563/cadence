import { describe, expect, it } from 'vitest';

import { shouldShowTravelBanner } from './travelBanner';

const profile = { timeZone: 'Asia/Kolkata', pendingTimeZone: null };

describe('shouldShowTravelBanner', () => {
  it('stays hidden when the device is in the saved zone', () => {
    expect(shouldShowTravelBanner('Asia/Kolkata', profile, [])).toBe(false);
  });

  it('shows when the device zone differs', () => {
    expect(shouldShowTravelBanner('America/New_York', profile, [])).toBe(true);
  });

  it('stays hidden when a change to the device zone is already pending', () => {
    expect(
      shouldShowTravelBanner('America/New_York', { ...profile, pendingTimeZone: 'America/New_York' }, []),
    ).toBe(false);
  });

  it('stays hidden for a zone the user dismissed', () => {
    expect(shouldShowTravelBanner('America/New_York', profile, ['America/New_York'])).toBe(false);
  });

  it('treats legacy zone names as the same zone', () => {
    expect(shouldShowTravelBanner('Asia/Calcutta', profile, [])).toBe(false);
  });
});
