'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Check, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';

import styles from './landing.module.css';
import {
  KIND_LABELS,
  progressOf,
  TODAY_ITEMS,
  toggleItem,
  YESTERDAY_ITEMS,
  type PreviewItem,
  type PreviewKind,
} from './previewDay';

type Day = 'yesterday' | 'today';

const KINDS: PreviewKind[] = ['habit', 'task', 'todo'];

const subscribeNothing = () => () => {};

function dayLabel(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * A working miniature of Cadence's Today view. Ticking an item calls
 * `onTick` (the hero turns it into a pulse of light along the threads);
 * yesterday is shown but locked, which is the product's signature rule.
 */
export function TodayPreview({
  onTick,
  onProgress,
}: {
  onTick: () => void;
  onProgress: (share: number) => void;
}) {
  const [day, setDay] = useState<Day>('today');
  const [today, setToday] = useState(TODAY_ITEMS);
  const [refused, setRefused] = useState(0);
  // Dates come from the visitor's clock: none on the server, real ones in the browser.
  const onClient = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const dates = onClient ? { today: dayLabel(0), yesterday: dayLabel(-1) } : null;

  const items = day === 'today' ? today : YESTERDAY_ITEMS;
  const { done, total } = progressOf(items);

  useEffect(() => {
    const p = progressOf(today);
    onProgress(p.done / p.total);
  }, [today, onProgress]);

  function press(item: PreviewItem) {
    if (day === 'yesterday') {
      setRefused((n) => n + 1);
      return;
    }

    setToday((current) => toggleItem(current, item.id));
    if (!item.done) onTick();
  }

  return (
    <div
      key={refused}
      className={cn(
        'border-border/80 bg-surface-raised relative w-full max-w-md rounded-2xl border p-5 shadow-[var(--cd-shadow-popover)] sm:p-6',
        refused > 0 && styles.refuse,
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-serif text-2xl font-semibold">
            {day === 'today' ? 'Today' : 'Yesterday'}
          </p>
          <p className="text-muted-foreground mt-0.5 h-5 text-(length:--cd-text-ui)">
            {dates ? (day === 'today' ? dates.today : dates.yesterday) : ''}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Day"
          className="bg-background/70 border-border/70 flex rounded-full border p-0.5 text-(length:--cd-text-ui)"
        >
          {(['yesterday', 'today'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={day === value}
              onClick={() => {
                setDay(value);
                setRefused(0);
              }}
              className={cn(
                'rounded-full px-3 py-1 capitalize transition-colors',
                day === value
                  ? 'bg-fill-selected text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        {KINDS.map((kind) => {
          const group = items.filter((item) => item.kind === kind);
          if (group.length === 0) return null;

          return (
            <section key={kind} aria-label={KIND_LABELS[kind]}>
              <p className="text-faint-foreground mb-1 text-(length:--cd-text-meta)">
                {KIND_LABELS[kind]}
              </p>
              <ul className="grid">
                {group.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={item.done}
                      aria-disabled={day === 'yesterday'}
                      onClick={() => press(item)}
                      className="hover:bg-fill-hover focus-visible:bg-fill-hover -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2 text-left outline-none"
                    >
                      <span
                        className={cn(
                          'grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors',
                          day === 'yesterday'
                            ? 'border-border text-faint-foreground'
                            : item.done
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/60',
                        )}
                      >
                        {day === 'yesterday' && !item.done ? (
                          <Lock className="size-2.5" aria-hidden="true" />
                        ) : item.done ? (
                          <Check className={cn('size-3', styles.tick)} strokeWidth={3} aria-hidden="true" />
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          'flex-1 text-(length:--cd-text-control)',
                          item.done && 'text-muted-foreground line-through decoration-1',
                        )}
                      >
                        {item.title}
                      </span>
                      {item.meta ? (
                        <span className="text-faint-foreground text-(length:--cd-text-meta) tabular-nums">
                          {item.meta}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-5" aria-live="polite">
        {day === 'yesterday' && refused > 0 ? (
          <p className="text-(length:--cd-text-ui)">
            Yesterday is closed. Past days can’t be changed, so your history stays honest.
          </p>
        ) : (
          <div className="grid gap-2">
            <div className="bg-background/80 h-1 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
            <p className="text-muted-foreground text-(length:--cd-text-ui) tabular-nums">
              {done} of {total} done{day === 'yesterday' ? ' · locked' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
