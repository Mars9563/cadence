import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CadenceCalendar() {
  return (
    <>
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
    </>
  );
}
