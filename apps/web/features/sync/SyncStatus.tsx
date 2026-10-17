'use client';

import { CloudOff, KeyRound, RefreshCw, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { hardNavigate } from '@/lib/navigation';
import {
  useDraftCount,
  useFlushSync,
  useIsSocketConnected,
  useIsSyncing,
  useOutboxCount,
  useSessionExpired,
  useSyncRetryAt,
  useSyncStorageFailed,
} from '@/store/selectors';

type SyncView = {
  icon: ReactNode;
  label: string;
  detail: string;
  tone: 'muted' | 'warning' | 'danger';
  action?: 'retry' | 'sign-in';
};

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/**
 * What the sync engine is doing, in words. Null when everything is saved
 * and connected (the normal case shows nothing at all).
 */
function useSyncView(): SyncView | null {
  const connected = useIsSocketConnected();
  const syncing = useIsSyncing();
  const retryAt = useSyncRetryAt();
  const storageFailed = useSyncStorageFailed();
  const sessionExpired = useSessionExpired();
  const queued = useOutboxCount();
  const pending = queued + useDraftCount();

  if (sessionExpired) {
    return {
      icon: <KeyRound className="size-4" />,
      label: 'Sign in again',
      detail: pending
        ? `Your session ended. ${plural(pending, 'change')} wait on this device and sync after you sign in.`
        : 'Your session ended. Sign in again to keep syncing.',
      tone: 'danger',
      action: 'sign-in',
    };
  }

  if (storageFailed) {
    return {
      icon: <TriangleAlert className="size-4" />,
      label: 'Not stored on device',
      detail:
        'This browser refused to store unsynced changes, so they only last until you close the tab. Keep the tab open until you are back online.',
      tone: 'danger',
    };
  }

  if (!connected) {
    return {
      icon: <CloudOff className="size-4" />,
      label: 'Offline',
      detail: pending
        ? `You’re offline. ${plural(pending, 'change')} saved on this device will sync when the connection is back.`
        : 'You’re offline. Keep working; changes are saved on this device and sync when the connection is back.',
      tone: 'warning',
    };
  }

  if (retryAt && pending) {
    return {
      icon: <RefreshCw className="size-4" />,
      label: 'Sync paused',
      detail: `${plural(pending, 'change')} couldn’t sync yet. Cadence retries by itself; select to retry now.`,
      tone: 'warning',
      action: 'retry',
    };
  }

  // Content saves have their own indicator in the editor; only queued
  // operations (from offline time) are worth a sidebar status.
  if (syncing && queued) {
    return {
      icon: <RefreshCw className="size-4 animate-spin [animation-duration:2s]" />,
      label: 'Syncing',
      detail: `Syncing ${plural(queued, 'change')}.`,
      tone: 'muted',
    };
  }

  return null;
}

const TONE = {
  muted: 'text-muted-foreground',
  warning: 'text-(--cd-warning)',
  danger: 'text-destructive',
};

/**
 * Sync status for the sidebars. `compact` is the icon-only rail.
 */
export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const view = useSyncView();
  const flushSync = useFlushSync();

  if (!view) return null;

  const onClick =
    view.action === 'retry'
      ? () => void flushSync()
      : view.action === 'sign-in'
        ? () => hardNavigate('/auth/sign-in')
        : undefined;

  const content = (
    <>
      <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">
        {view.icon}
      </span>
      {compact ? (
        <span className="sr-only">{view.detail}</span>
      ) : (
        <span className="truncate">{view.label}</span>
      )}
    </>
  );

  const className = cn(
    'flex items-center gap-2.5 rounded-md text-(length:--cd-text-ui) outline-none',
    'focus-visible:ring-1 focus-visible:ring-primary/60',
    compact ? 'size-9 justify-center' : 'h-8 w-full px-2.5',
    onClick && 'hover:bg-fill-hover cursor-pointer',
    TONE[view.tone],
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          onClick ? (
            <button type="button" className={className} onClick={onClick} />
          ) : (
            <div role="status" aria-live="polite" tabIndex={0} className={className} />
          )
        }
      >
        {content}
      </TooltipTrigger>

      <TooltipContent side="right" className="max-w-64">
        {view.detail}
      </TooltipContent>
    </Tooltip>
  );
}
