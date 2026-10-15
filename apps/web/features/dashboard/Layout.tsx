import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dashboard } from './Dashboard';
import { Sidebar } from './Sidebar/Sidebar';
import { TopBar } from './TopBar';
import { DailyNote } from './DailyNote/dailyNote';

export function DashboardLayout() {
  return (
    <div className="bg-background flex h-dvh min-h-0 gap-3 overflow-hidden p-3">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
        <TopBar />

        <Tabs defaultValue="dashboard" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="w-fit shrink-0">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="daily-note">Daily Note</TabsTrigger>
          </TabsList>

          <TabsContent
            value="dashboard"
            className="min-h-0 flex-1 overflow-hidden"
          >
            <Dashboard />
          </TabsContent>

          <TabsContent
            value="daily-note"
            className="min-h-0 flex-1 overflow-hidden"
          >
            <DailyNote />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
