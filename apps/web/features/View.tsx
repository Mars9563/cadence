'use client';
import { useViewMode } from '@/store/selectors';
import { DashboardLayout } from './dashboard/Layout';
import { NotesLayout } from './notes/Layout';

export function View() {
  const viewMode = useViewMode();
  return (
    <div className="bg-background">
      {viewMode == 'Dashboard' ? <DashboardLayout /> : <NotesLayout />}
    </div>
  );
}
