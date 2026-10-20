'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { deleteAccount, downloadExport } from '@/api/account';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toUserMessage } from '@/lib/errors';
import { hardNavigate } from '@/lib/navigation';
import { createClient } from '@/lib/supabase/client';
import { useIsSocketConnected, useUser } from '@/store/selectors';

const HEADING = 'text-foreground text-(length:--cd-text-ui) font-medium';
const META = 'text-muted-foreground text-(length:--cd-text-meta)';

/** Forget everything this device kept for the account. */
function clearLocalData(userId: string) {
  try {
    for (const key of [`cadence:sync:v1:${userId}`, `cadence:note-tabs:${userId}`]) {
      localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable: nothing was kept.
  }
}

/** Settings → Account: download my data, and the danger zone. */
export function AccountData() {
  const user = useUser();
  const isOnline = useIsSocketConnected();

  const [downloading, setDownloading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setDownloading(true);

    try {
      await downloadExport();
    } catch (caught) {
      toast.error(toUserMessage(caught, 'Your data couldn’t be exported. Try again.'));
    } finally {
      setDownloading(false);
    }
  }

  async function confirmDelete() {
    if (!user) return;

    setError(null);
    setDeleting(true);

    try {
      await deleteAccount();
      clearLocalData(user.id);
      await createClient().auth.signOut({ scope: 'local' }).catch(() => undefined);
      hardNavigate('/auth/sign-in?deleted=1');
    } catch (caught) {
      setError(toUserMessage(caught, 'Your account couldn’t be deleted. Try again.'));
      setDeleting(false);
    }
  }

  const downloadButton = (
    <Button
      variant="outline"
      size="sm"
      disabled={downloading || !isOnline}
      onClick={() => void download()}
    >
      {downloading ? 'Preparing…' : 'Download my data'}
    </Button>
  );

  return (
    <>
      <section className="grid gap-2" aria-labelledby="account-data">
        <h3 id="account-data" className={HEADING}>
          Your data
        </h3>
        <p className={META}>
          A ZIP with your notes and daily notes as Markdown files, plus habits, tasks and history as
          JSON.
        </p>
        <div>{downloadButton}</div>
      </section>

      <section
        className="border-destructive/40 grid gap-2 rounded-md border px-4 py-3"
        aria-labelledby="account-danger"
      >
        <h3 id="account-danger" className="text-destructive text-(length:--cd-text-ui) font-medium">
          Danger zone
        </h3>
        <p className={META}>Delete your account and everything in it. This can’t be undone.</p>
        <div>
          <Button
            variant="destructive"
            size="sm"
            disabled={!isOnline}
            onClick={() => {
              setTyped('');
              setError(null);
              setDialogOpen(true);
            }}
          >
            Delete account
          </Button>
        </div>
      </section>

      <AlertDialog open={dialogOpen} onOpenChange={(open) => !deleting && setDialogOpen(open)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your notes, daily notes, habits, tasks, history, profile
              photo and your login. It can’t be undone. You may want to download your data first.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-3">
            <div>{downloadButton}</div>

            <label htmlFor="delete-confirm" className={HEADING}>
              Type DELETE to confirm
            </label>
            <Input
              id="delete-confirm"
              value={typed}
              autoComplete="off"
              disabled={deleting}
              onChange={(event) => setTyped(event.target.value)}
            />

            {error ? (
              <p role="alert" className="text-destructive text-(length:--cd-text-ui)">
                {error}
              </p>
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={typed !== 'DELETE' || deleting || !isOnline}
              onClick={() => void confirmDelete()}
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
