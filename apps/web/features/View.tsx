'use client'
import { useViewMode } from "@/store/selectors";
import { DashboardLayout } from "./dashboard/Layout";

export function View() {
      const viewMode = useViewMode();
    return (
      <div className="bg-background">
        {viewMode == 'Dashboard' ? <DashboardLayout /> : <>potato</>}
      </div>
    );
}