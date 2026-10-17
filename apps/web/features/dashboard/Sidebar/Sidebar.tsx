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
import { SyncStatus } from '@/features/sync/SyncStatus';

import { LayoutDashboard, LogOut, NotebookText, Settings } from 'lucide-react';
import { MdSpaceDashboard } from 'react-icons/md';

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
            aria-current={active ? 'page' : undefined}
            className={cn(
              'text-muted-foreground relative size-9 rounded-md',
              'hover:bg-fill-hover dark:hover:bg-fill-hover hover:text-foreground',
              'transition-colors duration-(--cd-duration-fast)',
              /* Active: filled, plus a short accent bar on the rail edge. */
              active &&
                'bg-fill-selected text-foreground hover:bg-fill-selected dark:hover:bg-fill-selected before:bg-primary before:absolute before:top-1/2 before:-left-2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full',
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
      <aside className="bg-sidebar flex w-13 shrink-0 flex-col items-center border-r border-border/70 pb-2">
        {/* Brand, in the shared top band. */}
        <div className="flex h-(--cd-band-height) shrink-0 items-center">
          <div
            aria-hidden="true"
            className="bg-surface-raised text-primary flex size-7 items-center justify-center rounded-md"
          >
            <MdSpaceDashboard size={16} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-2 flex flex-col gap-1" aria-label="Primary">
          <RailButton
            label="Dashboard"
            active={viewMode === 'Dashboard'}
            onClick={() => setViewMode('Dashboard')}
          >
            <LayoutDashboard className="size-[18px]" />
          </RailButton>

          <RailButton
            label="Notes"
            active={viewMode === 'Notes'}
            onClick={() => setViewMode('Notes')}
          >
            <NotebookText className="size-[18px]" />
          </RailButton>
        </nav>

        {/* Bottom area */}
        <div className="mt-auto flex flex-col items-center gap-1">
          <SyncStatus compact />

          <RailButton label="Sign out" onClick={() => setSignOutModalOpen(true)}>
            <LogOut className="size-[18px]" />
          </RailButton>
        </div>
      </aside>

      <SignOutDialog />
    </>
  );
}

function NavRow({
  label,
  icon,
  active = false,
  disabled = false,
  badge,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'text-muted-foreground relative flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-(length:--cd-text-ui) transition-colors duration-(--cd-duration-fast) outline-none',
        'hover:bg-fill-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary/60',
        'disabled:text-faint-foreground disabled:hover:bg-transparent',
        /* Active: filled, plus a short accent bar on the sidebar edge. */
        active &&
          'bg-fill-selected text-foreground hover:bg-fill-selected before:bg-primary before:absolute before:top-1/2 before:-left-2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full',
      )}
    >
      <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">
        {icon}
      </span>

      <span className="truncate">{label}</span>

      {badge ? (
        <span className="bg-fill-selected text-muted-foreground ml-auto rounded-sm px-1.5 py-0.5 text-[11px] leading-none">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function ExpandedSidebar() {
  const viewMode = useViewMode();
  const setViewMode = useSetViewMode();

  return (
    <>
      <aside className="bg-sidebar flex w-56 shrink-0 flex-col border-r border-border/70">
        {/* Brand, in the shared top band. */}
        <div className="flex h-(--cd-band-height) shrink-0 items-center gap-2.5 px-3">
          <div
            aria-hidden="true"
            className="bg-surface-raised text-primary flex size-7 items-center justify-center rounded-md"
          >
            <MdSpaceDashboard size={16} />
          </div>

          <p className="text-foreground text-(length:--cd-text-ui) font-semibold">
            Cadence
          </p>
        </div>

        {/* Navigation */}
        <nav className="mt-2 flex flex-col gap-0.5 px-2" aria-label="Primary">
          <NavRow
            label="Dashboard"
            icon={<LayoutDashboard className="size-4" />}
            active={viewMode === 'Dashboard'}
            onClick={() => setViewMode('Dashboard')}
          />

          <NavRow
            label="Notes"
            icon={<NotebookText className="size-4" />}
            active={viewMode === 'Notes'}
            onClick={() => setViewMode('Notes')}
          />

          <NavRow
            label="Settings"
            icon={<Settings className="size-4" />}
            disabled
            badge="Soon"
          />
        </nav>

        {/* Bottom area */}
        <div className="mt-auto flex flex-col gap-0.5 px-2 pb-2">
          <SyncStatus />

          <SignOutButton />
        </div>
      </aside>

      <SignOutDialog />
    </>
  );
}
