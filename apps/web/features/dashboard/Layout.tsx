import { Dashboard } from './Dashboard';
import { Sidebar } from './Sidebar/Sidebar';
import { TopBar } from './TopBar';

export function DashboardLayout() {
  return (
    <div className="bg-background flex min-h-screen gap-3 p-3">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <TopBar />

        <Dashboard />
      </div>
    </div>
  );
}
