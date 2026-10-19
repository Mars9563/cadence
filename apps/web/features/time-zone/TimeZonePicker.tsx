'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { listTimeZones, searchTimeZones, zoneLabel } from './zones';

type TimeZonePickerProps = {
  id: string;
  value: string;
  onChange: (zone: string) => void;
  disabled?: boolean;
};

/**
 * Searchable list of every IANA zone (city, region, current offset).
 * The chosen zone is shown above the search box.
 */
export function TimeZonePicker({ id, value, onChange, disabled }: TimeZonePickerProps) {
  const [query, setQuery] = useState('');

  const zones = useMemo(() => listTimeZones(), []);
  const results = useMemo(() => searchTimeZones(zones, query), [zones, query]);
  const current = zones.find((zone) => zone.id === value);

  // Open with the chosen zone visible instead of the top of the list.
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');

    if (list && selected) {
      list.scrollTop = selected.offsetTop - list.clientHeight / 2 + selected.offsetHeight / 2;
    }
    // Only on first render; later picks happen where the user already is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-2">
      <p className="text-foreground text-(length:--cd-text-ui)">
        {zoneLabel(value)}
        {current ? (
          <span className="text-muted-foreground tabular-nums"> · {current.offsetLabel}</span>
        ) : null}
      </p>

      <Input
        id={id}
        type="search"
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search a city or region"
        autoComplete="off"
        aria-controls={`${id}-list`}
      />

      <div
        ref={listRef}
        id={`${id}-list`}
        role="listbox"
        aria-label="Time zones"
        className="border-border/70 relative max-h-56 overflow-y-auto rounded-md border"
      >
        {results.length === 0 ? (
          <p className="text-muted-foreground px-3 py-2 text-(length:--cd-text-meta)">
            No time zone matches “{query}”.
          </p>
        ) : (
          results.map((zone) => {
            const selected = zone.id === value;

            return (
              <button
                key={zone.id}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onClick={() => onChange(zone.id)}
                className={cn(
                  'hover:bg-fill-hover focus-visible:bg-fill-hover flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-(length:--cd-text-ui) outline-none',
                  selected && 'bg-fill-selected text-foreground',
                )}
              >
                <span>
                  {zone.city}
                  {zone.region ? (
                    <span className="text-muted-foreground"> · {zone.region}</span>
                  ) : null}
                </span>
                <span className="text-muted-foreground shrink-0 text-(length:--cd-text-meta) tabular-nums">
                  {zone.offsetLabel}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
