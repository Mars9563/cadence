'use client';

import type { ComponentType } from 'react';
import { Clock, LogOut, ShieldCheck, UserRound } from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { SettingsSection } from '@/store/slices/uiSlice';
import {
  useSetSettingsOpen,
  useSetSettingsSection,
  useSettingsOpen,
  useSettingsSection,
} from '@/store/selectors';

import { AccountSection } from './sections/AccountSection';
import { TimeAndDaySection } from './sections/TimeAndDaySection';
import { ProfileSection } from './sections/ProfileSection';
import { SignOutSection } from './sections/SignOutSection';

const SECTIONS: {
  id: SettingsSection;
  label: string;
  icon: ComponentType<{ className?: string }>;
  Panel: ComponentType;
}[] = [
  { id: 'profile', label: 'Profile', icon: UserRound, Panel: ProfileSection },
  { id: 'day', label: 'Time & day', icon: Clock, Panel: TimeAndDaySection },
  { id: 'account', label: 'Account', icon: ShieldCheck, Panel: AccountSection },
  { id: 'sign-out', label: 'Sign out', icon: LogOut, Panel: SignOutSection },
];

/**
 * Settings, as a modal: section list on the left, the section on the right.
 * On narrow screens the list becomes a row of tabs above the section.
 * Mounted once (View); opened from the sidebar and the top band.
 */
export function SettingsModal() {
  const open = useSettingsOpen();
  const setOpen = useSetSettingsOpen();
  const section = useSettingsSection();
  const setSection = useSetSettingsSection();

  const active = SECTIONS.find((item) => item.id === section) ?? SECTIONS[0]!;
  const Panel = active.Panel;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className={cn(
          'cd-settings-sheet grid h-[min(640px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-[860px] gap-0 overflow-hidden p-0 sm:max-w-[860px]',
          'grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[208px_minmax(0,1fr)] md:grid-rows-1',
          // Phones: a full-screen sheet, clear of the notch and home bar.
          'max-md:inset-0 max-md:h-dvh max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:pt-[env(safe-area-inset-top)] max-md:pb-[env(safe-area-inset-bottom)] max-md:ring-0',
        )}
      >
        <nav
          aria-label="Settings sections"
          className="bg-sidebar flex flex-col gap-3 border-b border-border/70 p-3 md:border-r md:border-b-0"
        >
          <DialogTitle className="px-2 pt-1 text-(length:--cd-text-control)">
            Settings
          </DialogTitle>

          <ul className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] md:flex-col md:overflow-visible">
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === active.id;

              return (
                <li key={item.id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setSection(item.id)}
                    className={cn(
                      'text-muted-foreground flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-(length:--cd-text-ui) whitespace-nowrap transition-colors duration-(--cd-duration-fast) outline-none',
                      'hover:bg-fill-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary/60',
                      isActive && 'bg-fill-selected text-foreground hover:bg-fill-selected',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section
          aria-label={active.label}
          className="min-h-0 overflow-y-auto px-6 py-7 sm:px-8"
        >
          <Panel />
        </section>
      </DialogContent>
    </Dialog>
  );
}

/** Heading + one-line description at the top of every section. */
export function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header>
      <h2 className="text-foreground text-(length:--cd-text-control) font-semibold">
        {title}
      </h2>
      <p className="text-muted-foreground mt-1 text-(length:--cd-text-ui) leading-relaxed">
        {description}
      </p>
    </header>
  );
}

/** Shown in place of save buttons while the server can't be reached. */
export function OfflineNote() {
  return (
    <p className="text-(--cd-warning) text-(length:--cd-text-meta)">
      You’re offline. Settings can be changed once Cadence reconnects.
    </p>
  );
}
