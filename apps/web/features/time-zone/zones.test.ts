import { describe, expect, it } from 'vitest';

import { listTimeZones, searchTimeZones, zoneLabel } from './zones';

describe('listTimeZones', () => {
  const zones = listTimeZones();

  it('includes real IANA zones with an offset label', () => {
    const london = zones.find((zone) => zone.id === 'Europe/London');

    expect(london).toBeDefined();
    expect(london!.city).toBe('London');
    expect(london!.region).toBe('Europe');
    expect(zones.every((zone) => zone.offsetLabel.length > 0)).toBe(true);
  });
});

describe('searchTimeZones', () => {
  const zones = listTimeZones();

  it('finds a zone by city, ignoring case and underscores', () => {
    expect(searchTimeZones(zones, 'new york').map((zone) => zone.id)).toContain(
      'America/New_York',
    );
    expect(searchTimeZones(zones, 'KOLKATA').map((zone) => zone.id)).toContain('Asia/Kolkata');
  });

  it('returns everything for an empty query', () => {
    expect(searchTimeZones(zones, '  ')).toHaveLength(zones.length);
  });
});

describe('zoneLabel', () => {
  it('reads like a place', () => {
    expect(zoneLabel('America/Argentina/Buenos_Aires')).toBe('Buenos Aires (America/Argentina)');
  });
});
