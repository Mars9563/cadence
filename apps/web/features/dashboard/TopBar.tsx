'use client';

import { Orb } from '@yogesharc/thinking-orbs';
import { squares } from '@yogesharc/thinking-orbs/renders';
import { MdCloudQueue, MdKeyboardArrowDown, MdWbSunny } from 'react-icons/md';

import {
  useCurrentDateTime,
  useIsSocketConnected,
  useIsSocketConnecting,
  useUser,
} from '@/store/selectors';


function getGreeting(hour: number): string {
  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 17) {
    return 'Good afternoon';
  }

  if (hour < 21) {
    return 'Good evening';
  }

  return 'Good night';
}

function getUserName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const name = displayName?.trim();

  if (name) {
    return name.split(/\s+/)[0];
  }

  const emailName = email?.split('@')[0]?.trim();

  if (emailName) {
    return emailName;
  }

  return 'there';
}

function getInitials(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const source = displayName?.trim() || email?.split('@')[0]?.trim() || '?';

  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function TopBar() {
  const user = useUser();
  const currentDateTime = useCurrentDateTime();

  const isSocketConnected = useIsSocketConnected();
  const isSocketConnecting = useIsSocketConnecting();

  const greeting = getGreeting(currentDateTime.getHours());
  const name = getUserName(user?.displayName, user?.email);
  const initials = getInitials(user?.displayName, user?.email);

  const connectionState = isSocketConnecting
    ? 'waiting'
    : isSocketConnected
      ? 'base'
      : 'retrying';

  const connectionLabel = isSocketConnecting
    ? 'Syncing'
    : isSocketConnected
      ? 'Live'
      : 'Offline';

  return (
    <header className="bg-card/80 flex min-h-20 shrink-0 items-center justify-between gap-4 rounded-2xl border px-5 py-3 shadow-sm backdrop-blur-sm">
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
          Cadence
        </p>

        <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {greeting}, {name}
          </h1>

          <span className="text-muted-foreground hidden text-sm sm:inline">
            — let&apos;s keep the day moving.
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Weather integration stub */}
        <div className="bg-muted/50 hidden items-center gap-3 rounded-xl border px-3 py-2 sm:flex">
          <div className="bg-background flex size-8 items-center justify-center rounded-lg border">
            <MdWbSunny className="text-muted-foreground" size={18} />
          </div>

          <div className="leading-tight">
            <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Weather
            </p>

            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tabular-nums">--°</span>
              <span className="text-muted-foreground text-xs">Coming soon</span>
            </div>
          </div>
        </div>

        {/* Connection status */}
        <div
          className="bg-muted/50 flex items-center gap-2 rounded-xl border px-2.5 py-2 sm:px-3"
          title="Cadence connection status"
        >
          <div className="bg-background flex size-8 items-center justify-center rounded-lg border">
            <Orb
              state={connectionState}
                          size={20}
                          render={squares}
              label={`Connection ${connectionLabel}`}
            />
          </div>

          <div className="hidden leading-tight sm:block">
            <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Connection
            </p>

            <p className="text-xs font-medium">{connectionLabel}</p>
          </div>
        </div>

        {/* User */}
        <div className="bg-muted/50 flex items-center gap-2 rounded-xl border py-1.5 pr-2.5 pl-1.5">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-xs font-semibold">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="size-full rounded-lg object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div className="hidden max-w-28 leading-tight md:block">
            <p className="truncate text-xs font-medium">{name}</p>

            <p className="text-muted-foreground truncate text-[10px]">
              Your cadence
            </p>
          </div>

          <MdKeyboardArrowDown
            className="text-muted-foreground hidden sm:block"
            size={18}
          />
        </div>

        {/* Keep the import/use of MdCloudQueue intentional for the future
            weather provider without introducing a dependency today. */}
        <span className="sr-only">
          <MdCloudQueue />
        </span>
      </div>
    </header>
  );
}
