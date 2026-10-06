'use client';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

import { SignOutButton } from '@/features/auth/SignOutButton';
import { SignOutDialog } from '@/features/auth/SignOutDialog';

import {
  MdDashboard,
  MdEventNote,
  MdNotes,
  MdSettings,
  MdSpaceDashboard,
} from 'react-icons/md';

import { useSetViewMode, useViewMode } from '@/store/selectors';

export function Sidebar() {
  const viewMode = useViewMode();
  const setViewMode = useSetViewMode();

  return (
    <>
      <aside className="bg-card flex w-56 shrink-0 flex-col rounded-2xl border p-3 shadow-sm">
        {/* Brand */}
        <div className="border-b px-2 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl shadow-sm">
              <MdSpaceDashboard size={21} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">Cadence</p>

              <p className="text-muted-foreground text-[11px]">Own your day.</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex flex-col gap-1.5" aria-label="Primary">
          <p className="text-muted-foreground mb-1 px-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
            Workspace
          </p>

          <Button
            variant="ghost"
            className={cn(
              'h-10 w-full justify-start gap-3 rounded-xl px-3',
              viewMode === 'Dashboard' && 'bg-muted text-foreground shadow-sm',
            )}
            onClick={() => setViewMode('Dashboard')}
          >
            <MdDashboard size={18} />
            <span>Dashboard</span>
          </Button>

          <Button
            variant="ghost"
            className={cn(
              'h-10 w-full justify-start gap-3 rounded-xl px-3',
              viewMode === 'Notes' && 'bg-muted text-foreground shadow-sm',
            )}
            onClick={() => setViewMode('Notes')}
          >
            <MdNotes size={18} />
            <span>Notes</span>
          </Button>

          <div className="mt-4">
            <p className="text-muted-foreground mb-1 px-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
              System
            </p>

            <Button
              variant="ghost"
              className="text-muted-foreground h-10 w-full justify-start gap-3 rounded-xl px-3"
              disabled
            >
              <MdSettings size={18} />
              <span>Settings</span>

              <span className="bg-muted text-muted-foreground ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-medium tracking-wider uppercase">
                Soon
              </span>
            </Button>
          </div>
        </nav>

        {/* Bottom area */}
        <div className="mt-auto pt-4">
          <div className="bg-muted/50 mb-3 rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <div className="bg-primary size-1.5 rounded-full" />

              <p className="text-xs font-medium">Your workspace</p>
            </div>

            <p className="text-muted-foreground mt-1 text-[10px] leading-relaxed">
              Keep the important things visible and the noise out.
            </p>
          </div>

          <div className="border-t pt-3">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <SignOutDialog />
    </>
  );
}
