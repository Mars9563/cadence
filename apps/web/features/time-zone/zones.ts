/**
 * The time zones people can pick: every IANA zone the browser knows, with a
 * readable place name and the current UTC offset. The database is still the
 * authority on which names are valid (is_valid_time_zone).
 */

export type TimeZoneOption = {
  /** IANA name, e.g. 'America/New_York'. */
  id: string;
  /** Last segment as words: 'New York'. */
  city: string;
  /** Everything before it: 'America', 'America/Argentina'. */
  region: string;
  /** Current offset, e.g. 'GMT-4', 'GMT+5:30'. */
  offsetLabel: string;
};

/**
 * Old names some browsers still report, mapped to today's IANA names (both
 * work in Postgres, but people search for the current spelling).
 */
const LEGACY_ZONE_NAMES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Rangoon': 'Asia/Yangon',
  'Europe/Kiev': 'Europe/Kyiv',
  'America/Godthab': 'America/Nuuk',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
};

export function normalizeZone(id: string): string {
  return LEGACY_ZONE_NAMES[id] ?? id;
}

/** 'America/Argentina/Buenos_Aires' -> 'Buenos Aires (America/Argentina)'. */
export function zoneLabel(id: string): string {
  const segments = id.split('/');
  const city = (segments.pop() ?? id).replaceAll('_', ' ');

  return segments.length > 0 ? `${city} (${segments.join('/')})` : city;
}

function offsetLabel(id: string, at: Date): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'shortOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName');

  return part?.value ?? 'GMT';
}

let cache: TimeZoneOption[] | null = null;

export function listTimeZones(at: Date = new Date()): TimeZoneOption[] {
  if (cache) return cache;

  const ids = [...new Set(Intl.supportedValuesOf('timeZone').map(normalizeZone))];

  cache = ids
    .map((id) => {
      const segments = id.split('/');
      const city = (segments.pop() ?? id).replaceAll('_', ' ');

      return { id, city, region: segments.join('/'), offsetLabel: offsetLabel(id, at) };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  return cache;
}

const normalize = (value: string) => value.toLowerCase().replaceAll('_', ' ').trim();

export function searchTimeZones(options: TimeZoneOption[], query: string): TimeZoneOption[] {
  const q = normalize(query);

  if (!q) return options;

  return options.filter(
    (option) =>
      normalize(option.id).includes(q) ||
      normalize(option.city).includes(q) ||
      normalize(option.region).includes(q),
  );
}

/** The device's zone, in today's spelling. */
export function detectTimeZone(): string {
  return normalizeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}
