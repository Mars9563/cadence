import type { NormalItem } from '@cadence/types';
import { describe, expect, it } from 'vitest';

import { getMaxNormalCompletions, isNormalCompletedOnDate } from './history';

function normal(completedAt: string | null, completedOn: string | null): NormalItem {
  return {
    id: crypto.randomUUID(),
    userId: 'u',
    title: 't',
    description: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    kind: 'normal',
    scheduledDate: null,
    scheduledTime: null,
    recurrenceKind: null,
    recurrenceDays: null,
    recurrenceStartDate: null,
    recurrenceEndDate: null,
    completedAt,
    completedOn,
  };
}

describe('isNormalCompletedOnDate', () => {
  it('uses the frozen completedOn, not the timestamp', () => {
    // Completed late on the 19th by its own day, though the timestamp is the 20th in UTC.
    const item = normal('2026-10-20T01:00:00Z', '2026-10-19');

    expect(isNormalCompletedOnDate(item, '2026-10-19')).toBe(true);
    expect(isNormalCompletedOnDate(item, '2026-10-20')).toBe(false);
  });

  it('is false for an incomplete item', () => {
    expect(isNormalCompletedOnDate(normal(null, null), '2026-10-19')).toBe(false);
  });
});

describe('getMaxNormalCompletions', () => {
  it('counts per completedOn date', () => {
    const items = [
      normal('2026-10-19T10:00:00Z', '2026-10-19'),
      normal('2026-10-20T01:00:00Z', '2026-10-19'),
      normal('2026-10-20T12:00:00Z', '2026-10-20'),
      normal(null, null),
    ];

    expect(getMaxNormalCompletions(items)).toBe(2);
  });
});
