'use client';

import type { ComponentType } from 'react';
import { LayoutDashboard, NotebookText, Settings } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useOpenSettings, useSetViewMode, useViewMode } from '@/store/selectors';

/**
 * Phone navigation (below 768px), in place of the sidebar: Dashboard,
 * Notes and Settings. Signing out lives in Settings. Keeps clear of the
 * home indicator with the bottom safe area.
 */
export function MobileTabBar({ className }: { className?: string }) {
  const viewMode = useViewMode();
  const setViewMode = useSetViewMode();
  const openSettings = useOpenSettings();

  const items: {
    label: string;
    icon: ComponentType<{ className?: string }>;
    active: boolean;
    onSelect: () => void;
  }[] = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: viewMode === 'Dashboard',
      onSelect: () => setViewMode('Dashboard'),
    },
    {
      label: 'Notes',
      icon: NotebookText,
      active: viewMode === 'Notes',
      onSelect: () => setViewMode('Notes'),
    },
    {
      label: 'Settings',
      icon: Settings,
      active: false,
      onSelect: () => openSettings(),
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'bg-sidebar shrink-0 border-t border-border/70 pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      <ul className="grid h-(--cd-tabbar-height) grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.label}>
              <button
                type="button"
                onClick={item.onSelect}
                aria-current={item.active ? 'page' : undefined}
                className={cn(
                  'flex size-full flex-col items-center justify-center gap-1 text-[11px] outline-none transition-colors duration-(--cd-duration-fast)',
                  'focus-visible:bg-fill-hover',
                  item.active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-(--cd-duration-fast)',
                    item.active && 'bg-fill-selected text-primary',
                  )}
                >
                  <Icon aria-hidden="true" className="size-[18px]" />
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
