'use client';

import { useCurrentDateTime, useUser } from '@/store/selectors';

import { CadenceCalendar } from './CadenceCalendar';
import { Clock } from './Clock';
import { MainWorkspace } from './MainWorkspace/MainWorkspace';
import { getGreeting, getUserName } from './TopBar';

/**
 * The day page: greeting and item lists on the canvas, with time and
 * history in a quiet context column on the right (below on narrow screens).
 */
export function Dashboard() {
  const user = useUser();
  const currentDateTime = useCurrentDateTime();

  const greeting = getGreeting(currentDateTime.getHours());
  const name = getUserName(user?.displayName, user?.email);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_288px] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_312px]">
      {/* Day page */}
      <main className="min-w-0 lg:overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 pt-10 pb-16 sm:px-10">
          <header className="mb-10">
            <h1 className="text-foreground font-serif text-[1.75rem] leading-tight font-semibold tracking-[-0.01em]">
              {greeting}, {name}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-(length:--cd-text-control)">
              Let&apos;s keep the day moving.
            </p>
          </header>

          <MainWorkspace />
        </div>
      </main>

      {/* Context */}
      <aside
        aria-label="Time and history"
        className="flex min-w-0 flex-col border-t border-border/70 lg:overflow-y-auto lg:border-t-0 lg:border-l"
      >
        <Clock />

        <CadenceCalendar />
      </aside>
    </div>
  );
}
