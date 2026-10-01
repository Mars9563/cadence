import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCurrentDateTime } from '@/store/selectors';
import { ClockUpdater } from './ClockUpdater';

export function Clock() {
  const currentTime = useCurrentDateTime();
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
  return (
    <>
      <ClockUpdater />
      {/* Clock / Day */}
      <Card>
        <CardContent className="flex flex-row items-center justify-between p-5">
          <div>
            <p className="text-4xl font-semibold tracking-tight">{time}</p>

            <p className="text-muted-foreground mt-1 text-sm">{date}</p>
          </div>

          <div className="flex flex-row items-center justify-center gap-4">
            <Separator orientation="vertical" className="h-14" />

            <div>
              <p className="text-muted-foreground text-sm">Day ends at</p>

              <p className="text-lg font-medium">04:00</p>

              <p className="text-muted-foreground text-xs">5h 46m left</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
