import { describe, expect, it } from 'vitest';

import {
  addDays,
  cadenceDayEnd,
  DEFAULT_DAY_SETTINGS,
  effectiveDaySettings,
  getCadenceDate,
  getCadenceDayEndInstant,
} from './cadenceDate';

const IST = DEFAULT_DAY_SETTINGS; // Asia/Kolkata, 04:00
const NY = { timeZone: 'America/New_York', dayEndTime: '04:00:00' };

describe('getCadenceDate', () => {
  it('switches date at the IST day end', () => {
    expect(getCadenceDate(new Date('2026-10-19T22:29:00Z'), IST)).toBe('2026-10-19');
    expect(getCadenceDate(new Date('2026-10-19T22:30:00Z'), IST)).toBe('2026-10-20');
  });

  it('uses the user zone, not the browser zone', () => {
    // 03:59 in New York on 2026-10-20 is still the 19th.
    expect(getCadenceDate(new Date('2026-10-20T07:59:00Z'), NY)).toBe('2026-10-19');
    expect(getCadenceDate(new Date('2026-10-20T08:00:00Z'), NY)).toBe('2026-10-20');
  });
});

// Same cases as supabase/tests/004_time_zone.test.sql (Postgres is the reference).
describe('cadenceDayEnd parity with Postgres cadence_day_end', () => {
  it.each([
    [IST, '2026-10-19', '2026-10-19T22:30:00.000Z'],
    [NY, '2026-03-07', '2026-03-08T08:00:00.000Z'], // DST start, EDT
    [{ timeZone: 'America/New_York', dayEndTime: '02:30:00' }, '2026-03-07', '2026-03-08T07:30:00.000Z'], // G1 gap
    [{ timeZone: 'America/New_York', dayEndTime: '01:30:00' }, '2026-10-31', '2026-11-01T06:30:00.000Z'], // O1 overlap
  ])('%o on %s ends at %s', (settings, date, expected) => {
    expect(cadenceDayEnd(settings, date).toISOString()).toBe(expected);
  });
});

describe('day end round trip in unusual offsets', () => {
  it.each(['Asia/Kathmandu', 'Pacific/Kiritimati', 'Australia/Lord_Howe'])('%s', (timeZone) => {
    const settings = { timeZone, dayEndTime: '04:00:00' };
    const end = cadenceDayEnd(settings, '2026-10-19');

    expect(getCadenceDate(end, settings)).toBe(addDays('2026-10-19', 1));
    expect(getCadenceDate(new Date(end.getTime() - 1), settings)).toBe('2026-10-19');
  });

  it('getCadenceDayEndInstant is the end of the day containing the instant', () => {
    expect(getCadenceDayEndInstant(new Date('2026-10-20T07:59:00Z'), NY).toISOString()).toBe(
      '2026-10-20T08:00:00.000Z',
    );
  });
});

describe('effectiveDaySettings', () => {
  const profile = {
    timeZone: 'Asia/Kolkata',
    dayEndTime: '04:00:00',
    pendingTimeZone: 'America/New_York',
    pendingDayEndTime: '05:00:00',
    pendingEffectiveAt: '2026-10-20T08:00:00Z',
  };

  it('uses the current settings before the pending change is due', () => {
    expect(effectiveDaySettings(profile, new Date('2026-10-20T07:59:59Z'))).toEqual(IST);
  });

  it('uses the pending settings from the moment they are due', () => {
    expect(effectiveDaySettings(profile, new Date('2026-10-20T08:00:00Z'))).toEqual({
      timeZone: 'America/New_York',
      dayEndTime: '05:00:00',
    });
  });

  it('uses the current settings when nothing is pending', () => {
    expect(
      effectiveDaySettings(
        { ...profile, pendingTimeZone: null, pendingDayEndTime: null, pendingEffectiveAt: null },
        new Date('2030-01-01T00:00:00Z'),
      ),
    ).toEqual(IST);
  });
});
