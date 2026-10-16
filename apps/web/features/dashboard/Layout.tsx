'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSurface } from '@/hooks/useSurface';

import { Dashboard } from './Dashboard';
import { Sidebar } from './Sidebar/Sidebar';
import { TopBar } from './TopBar';
import { DailyNote } from './DailyNote/dailyNote';

/*
 * Pill tabs in the shared top band, matching the note tab strip. The
 * dark: overrides replace shadcn's dark-mode trigger styles (the workspace
 * surface turns dark: on).
 */
const TAB_TRIGGER =
  'h-7 flex-none rounded-md border-0 px-2.5 text-(length:--cd-text-ui) font-normal text-muted-foreground transition-colors duration-(--cd-duration-fast) hover:bg-fill-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:outline-0 data-active:bg-fill-selected data-active:text-foreground data-active:shadow-none dark:text-muted-foreground dark:data-active:border-transparent dark:data-active:bg-fill-selected';

export function DashboardLayout() {
  useSurface('workspace');

  return (
    <div className="bg-background text-foreground flex h-dvh min-h-0 overflow-hidden">
      <Sidebar />

      <Tabs
        defaultValue="dashboard"
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-0"
      >
        {/* Shared top band: view tabs on the left, status on the right. */}
        <header className="bg-sidebar flex h-(--cd-band-height) shrink-0 items-center justify-between gap-3 border-b border-border/70 px-2">
          <TabsList className="h-7 gap-1 bg-transparent p-0">
            <TabsTrigger value="dashboard" className={TAB_TRIGGER}>
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="daily-note" className={TAB_TRIGGER}>
              Daily note
            </TabsTrigger>
          </TabsList>

          <TopBar />
        </header>

        <TabsContent value="dashboard" className="min-h-0 flex-1 overflow-hidden">
          <Dashboard />
        </TabsContent>

        <TabsContent value="daily-note" className="min-h-0 flex-1 overflow-hidden">
          <DailyNote />
        </TabsContent>
      </Tabs>
    </div>
  );
}
