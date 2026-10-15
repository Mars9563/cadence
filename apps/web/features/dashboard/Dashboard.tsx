import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { CadenceCalendar } from './CadenceCalendar';
import { Clock } from './Clock';
import { MainWorkspace } from './MainWorkspace/MainWorkspace';

export function Dashboard() {
  return (
    <main className="bg-card/40 min-h-0 flex-1 overflow-hidden rounded-2xl border shadow-sm">
      <div className="grid h-full min-h-0 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main workspace */}
        <MainWorkspace />

        {/* Context */}
        <aside className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
          <Clock />

          <CadenceCalendar />
        </aside>
      </div>
    </main>
  );
}
