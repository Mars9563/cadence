'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  useDraftCount,
  useOutboxCount,
  useSetSignOutModalOpen,
  useSignOutModalOpen,
} from '@/store/selectors';
import { useCadenceStore } from '@/store/store';

import { createClient } from '@/lib/supabase/client';
import { hardNavigate } from '@/lib/navigation';

/** How long sign-out waits for a last sync before going ahead. */
const FINAL_SYNC_TIMEOUT_MS = 4_000;

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function SignOutDialog() {
  const open = useSignOutModalOpen();
  const setOpen = useSetSignOutModalOpen();

  const pending = useOutboxCount() + useDraftCount();

  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      // One last chance to send what is waiting.
      const store = useCadenceStore.getState();

      if (store.isSocketConnected) {
        await Promise.race([
          store.flushSync(),
          new Promise((resolve) => setTimeout(resolve, FINAL_SYNC_TIMEOUT_MS)),
        ]);
      }

      const { error } = await createClient().auth.signOut();

      if (error) {
        console.error('Failed to sign out:', error);
        return;
      }

      /*
       * A full navigation, not just closing the dialog: it drops the socket,
       * every store and timer, so nothing of this account stays in memory.
       * (It used to leave the app on screen, still connected, until the next
       * reload.) Unsynced changes stay in this browser under this account
       * and sync the next time it signs in here.
       */
      hardNavigate('/auth/sign-in');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out?</AlertDialogTitle>

          <AlertDialogDescription>
            {pending > 0
              ? `${plural(pending, 'change')} haven’t synced yet. They stay on this device and sync the next time you sign in here.`
              : 'Everything is synced. Your data stays safe in your account.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSigningOut}>Cancel</AlertDialogCancel>

          <AlertDialogAction onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
