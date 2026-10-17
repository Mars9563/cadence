'use client';

import {
  useCadenceDayEnd,
  useCurrentDateTime,
  useUser,
} from '@/store/selectors';

import { formatTime } from '@/lib/itemFormat';


function formatRemainingTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${hours}h ${minutes}m left`;
}

export function Clock() {
  const currentTime = useCurrentDateTime();
  const cadenceDayEnd = useCadenceDayEnd();
  const endTime = useUser()?.dayEndTime;

  const time = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const date = currentTime.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const remainingTime = cadenceDayEnd
    ? formatRemainingTime(cadenceDayEnd.getTime() - currentTime.getTime())
    : null;

  return (
    <>
      <section aria-label="Time" className="border-b border-border/70 px-5 py-5">
        <p
          className="text-foreground text-[2rem] leading-none font-medium tracking-[-0.02em] tabular-nums"
          suppressHydrationWarning
        >
          {time}
        </p>

        <p
          className="text-muted-foreground mt-2 truncate text-(length:--cd-text-ui)"
          suppressHydrationWarning
        >
          {date}
        </p>

        <div className="mt-4 flex items-baseline justify-between gap-3 text-(length:--cd-text-ui)">
          <dl className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Day ends at</dt>
            <dd className="text-foreground tabular-nums">
              {formatTime(endTime ?? null) ?? '--:--'}
            </dd>
          </dl>

          <p className="text-muted-foreground tabular-nums">
            {remainingTime ?? 'Calculating…'}
          </p>
        </div>
      </section>
    </>
  );
}
