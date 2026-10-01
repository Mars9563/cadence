import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Clock } from './Clock';

export function Dashboard() {
  return (
    <main className="bg-secondary flex-1 overflow-hidden rounded-lg border">
      <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_35%]">
        {/* ─────────────────────────────────────────────
            LEFT — Main workspace
        ───────────────────────────────────────────── */}
        <section className="min-w-0 overflow-y-auto pr-1">
          {/* Habits */}
          <DashboardSection
            title="Habits"
            description="Build the person you want to be."
            action="Add habit"
          >
            <div className="divide-y">
              <HabitRow label="Read 10 pages" recurrence="Daily" />
              <HabitRow label="Exercise" recurrence="Daily" />
              <HabitRow label="Meditate" recurrence="Mon Wed Fri" />
            </div>
          </DashboardSection>

          {/* Tasks */}
          <DashboardSection
            title="Tasks"
            description="Today's commitments."
            action="Add task"
          >
            <div className="divide-y">
              <TaskRow label="Finish project" time="10:00" />
              <TaskRow label="Go to gym" time="14:00" />
              <TaskRow label="Read documentation" time="18:00" />
            </div>
          </DashboardSection>

          {/* Normal Items */}
          <DashboardSection
            title="Normal items"
            description="Stuff to handle. No date, no pressure."
            action="Add item"
          >
            <div className="divide-y">
              <ItemRow label="Buy groceries" />
              <ItemRow label="Clean desk" />
              <ItemRow label="Call mom" />
            </div>
          </DashboardSection>
        </section>

        {/* ─────────────────────────────────────────────
            RIGHT — Context / secondary information
        ───────────────────────────────────────────── */}
        <aside className="flex min-w-0 flex-col gap-4">
          <Clock />
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="text-muted-foreground flex h-64 items-center justify-center rounded-md border border-dashed text-sm">
                Calendar
              </div>
            </CardContent>
          </Card>

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

/* ─────────────────────────────────────────────
   Section
───────────────────────────────────────────── */

function DashboardSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

          <p className="text-muted-foreground text-sm">{description}</p>
        </div>

        <Button variant="outline" size="sm">
          + {action}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">{children}</CardContent>
      </Card>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Habit
───────────────────────────────────────────── */

function HabitRow({
  label,
  recurrence,
}: {
  label: string;
  recurrence: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Checkbox />

      <span className="flex-1 text-sm">{label}</span>

      <span className="text-muted-foreground text-xs">{recurrence}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Task
───────────────────────────────────────────── */

function TaskRow({ label, time }: { label: string; time: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Checkbox />

      <span className="flex-1 text-sm">{label}</span>

      <span className="text-muted-foreground text-xs">{time}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Normal item
───────────────────────────────────────────── */

function ItemRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Checkbox />

      <span className="text-sm">{label}</span>
    </div>
  );
}
