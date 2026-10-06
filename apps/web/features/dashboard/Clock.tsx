'use client';

import { MdAccessTime, MdTimelapse } from 'react-icons/md';

import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import {
  useCadenceDayEnd,
  useCurrentDateTime,
  useUser,
} from '@/store/selectors';

import { ClockUpdater } from './ClockUpdater';

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
      <ClockUpdater />

      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] uppercase">
                <MdAccessTime size={13} />
                Current time
              </div>

              <p
                className="text-4xl font-semibold tracking-[-0.04em] tabular-nums"
                suppressHydrationWarning
              >
                {time}
              </p>

              <p
                className="text-muted-foreground mt-1 truncate text-xs"
                suppressHydrationWarning
              >
                {date}
              </p>
            </div>

            <Separator orientation="vertical" className="h-16" />

            <div className="min-w-24">
              <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] uppercase">
                <MdTimelapse size={13} />
                Cadence
              </div>

              <p className="text-muted-foreground text-[11px]">Day ends at</p>

              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {endTime ?? '--:--'}
              </p>

              <p className="text-muted-foreground mt-0.5 text-[10px] tabular-nums">
                {remainingTime ?? 'Calculating...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
