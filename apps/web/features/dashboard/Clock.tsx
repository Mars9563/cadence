'use client';

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

      <Card>
        <CardContent className="flex flex-row items-center justify-between p-5">
          <div>
            <p
              className="text-4xl font-semibold tracking-tight"
              suppressHydrationWarning
            >
              {time}
            </p>

            <p className="text-muted-foreground mt-1 text-sm">{date}</p>
          </div>

          <div className="flex flex-row items-center justify-center gap-4">
            <Separator orientation="vertical" className="h-14" />

            <div>
              <p className="text-muted-foreground text-sm">Day ends at</p>

              <p className="text-lg font-medium">{endTime ?? '--:--'}</p>

              <p className="text-muted-foreground text-xs">
                {remainingTime ?? 'Calculating...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
