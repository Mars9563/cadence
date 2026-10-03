import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from './Clock';
import { CadenceCalendar } from './CadenceCalendar';
import { MainWorkspace } from './MainWorkspace/MainWorkspace';

export function Dashboard() {
  return (
    <main className="bg-secondary flex-1 overflow-hidden rounded-lg border">
      <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_35%]">
        <MainWorkspace />

        {/* ─────────────────────────────────────────────
            RIGHT — Context / secondary information
        ───────────────────────────────────────────── */}
        <aside className="flex min-w-0 flex-col gap-4">
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
