// DashboardLayout.tsx

import { Dashboard } from './Dashboard';
import { Sidebar } from './Sidebar/Sidebar';

export function DashboardLayout() {
  return (
    <div className="flex h-screen gap-4 p-2">
      <Sidebar />
      <Dashboard />
    </div>
  );
}
