'use client';

import { Orb } from '@yogesharc/thinking-orbs';
import { squares } from '@yogesharc/thinking-orbs/renders';

import { cn } from '@/lib/utils';
import { UserAvatar } from '@/features/settings/UserAvatar';
import {
  useIsSocketConnected,
  useOpenSettings,
  useIsSocketConnecting,
  useIsSyncing,
  useUser,
} from '@/store/selectors';

export function getGreeting(hour: number): string {
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

export function getUserName(
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

export function getInitials(
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

/**
 * Right side of the dashboard's top band: connection state and the user.
 * The greeting lives in the page itself (Dashboard).
 */
export function TopBar() {
  const user = useUser();

  const isSocketConnected = useIsSocketConnected();
  const isSocketConnecting = useIsSocketConnecting();
  const isSyncing = useIsSyncing();

  const name = getUserName(user?.displayName, user?.email);
  const openSettings = useOpenSettings();

  const connectionState = isSocketConnecting
    ? 'waiting'
    : isSocketConnected
      ? 'base'
      : 'retrying';

  const connectionLabel = isSocketConnected
    ? isSyncing
      ? 'Syncing'
      : 'Live'
    : isSocketConnecting
      ? 'Reconnecting'
      : 'Offline';

  return (
    <div className="flex shrink-0 items-center gap-1">
      {/* Connection status */}
      <div
        role="status"
        aria-live="polite"
        title="Connection to Cadence"
        className={cn(
          'flex h-7 items-center gap-1.5 rounded-md px-2 text-(length:--cd-text-meta)',
          isSocketConnected && !isSocketConnecting
            ? 'text-muted-foreground'
            : 'text-(--cd-warning)',
        )}
      >
        <Orb
          state={connectionState}
          size={14}
          render={squares}
          label={`Connection ${connectionLabel}`}
          className={
            isSocketConnected && !isSocketConnecting
              ? 'text-primary'
              : 'text-(--cd-warning)'
          }
        />
        <span aria-hidden="true">{connectionLabel}</span>
      </div>

      {/* User: opens settings on the Profile section */}
      <button
        type="button"
        onClick={() => openSettings('profile')}
        aria-label="Open settings"
        className="hover:bg-fill-hover focus-visible:ring-primary/60 flex h-7 min-w-0 items-center gap-2 rounded-md pr-2 pl-1 transition-colors duration-(--cd-duration-fast) outline-none focus-visible:ring-1"
      >
        <UserAvatar className="size-6 text-[10px]" />

        <span className="text-foreground hidden max-w-32 truncate text-(length:--cd-text-ui) md:block">
          {name}
        </span>
      </button>
    </div>
  );
}
