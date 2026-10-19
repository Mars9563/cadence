'use client';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { useViewMode } from '@/store/selectors';
import { DashboardLayout } from './dashboard/Layout';
import { NotesLayout } from './notes/Layout';
import { SettingsModal } from './settings/SettingsModal';
import { TravelBanner } from './time-zone/TravelBanner';

export function View() {
  const viewMode = useViewMode();

  // Lets the phone editor toolbar sit just above the on-screen keyboard.
  useKeyboardInset();

  return (
    <div className="bg-background">
      {viewMode == 'Dashboard' ? <DashboardLayout /> : <NotesLayout />}
      <SettingsModal />
      <TravelBanner />
    </div>
  );
}
