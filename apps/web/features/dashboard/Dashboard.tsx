import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { CadenceCalendar } from './CadenceCalendar';
import { Clock } from './Clock';
import { MainWorkspace } from './MainWorkspace/MainWorkspace';

export function Dashboard() {
  return (
    <main className="bg-card/40 min-h-0 flex-1 overflow-hidden rounded-2xl border shadow-sm">
      <div className="grid h-full min-h-0 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Main workspace */}
        <MainWorkspace />

        {/* Right — Context / secondary information */}
        <aside className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
          <Clock />

          <CadenceCalendar />

          {/* Daily Notes */}
          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader>
              <CardTitle>Daily Notes</CardTitle>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1">
              <div className="text-muted-foreground flex w-full items-start rounded-md border border-dashed p-4 text-sm">
                Write something for today...
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
