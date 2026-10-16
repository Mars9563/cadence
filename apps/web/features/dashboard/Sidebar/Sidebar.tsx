'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { SignOutButton } from '@/features/auth/SignOutButton';
import { SignOutDialog } from '@/features/auth/SignOutDialog';

import {
  MdDashboard,
  MdEventNote,
  MdLogout,
  MdNotes,
  MdSettings,
  MdSpaceDashboard,
} from 'react-icons/md';

import {
  useSetSignOutModalOpen,
  useSetViewMode,
  useViewMode,
} from '@/store/selectors';

interface SidebarProps {
  /**
   * Icon-only rail (used by the Notes view, where the file-system column
   * needs the width). Labels move into tooltips.
   */
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  if (collapsed) {
    return <CollapsedSidebar />;
  }

  return <ExpandedSidebar />;
}

function RailButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            className={cn(
              'size-10 rounded-xl',
              active && 'bg-muted text-foreground shadow-sm',
            )}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>

      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function CollapsedSidebar() {
  const viewMode = useViewMode();
  const setViewMode = useSetViewMode();
  const setSignOutModalOpen = useSetSignOutModalOpen();

  return (
    <>
      <aside className="bg-card flex w-16 shrink-0 flex-col items-center rounded-2xl border py-3 shadow-sm">
        {/* Brand */}
        <div className="border-b pb-3">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl shadow-sm">
            <MdSpaceDashboard size={21} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-3 flex flex-col gap-1.5" aria-label="Primary">
          <RailButton
            label="Dashboard"
            active={viewMode === 'Dashboard'}
            onClick={() => setViewMode('Dashboard')}
          >
            <MdDashboard size={18} />
          </RailButton>

          <RailButton
            label="Notes"
            active={viewMode === 'Notes'}
            onClick={() => setViewMode('Notes')}
          >
            <MdNotes size={18} />
          </RailButton>
        </nav>

        {/* Bottom area */}
        <div className="mt-auto border-t pt-3">
          <RailButton label="Logout" onClick={() => setSignOutModalOpen(true)}>
            <MdLogout size={20} />
          </RailButton>
        </div>
      </aside>

      <SignOutDialog />
    </>
  );
}

function ExpandedSidebar() {
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
