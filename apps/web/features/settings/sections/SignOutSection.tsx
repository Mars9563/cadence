'use client';

import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  useDraftCount,
  useOutboxCount,
  useSetSettingsOpen,
  useSetSignOutModalOpen,
} from '@/store/selectors';

import { SectionHeader } from '../SettingsModal';

export function SignOutSection() {
  const setSettingsOpen = useSetSettingsOpen();
  const setSignOutModalOpen = useSetSignOutModalOpen();
  const pending = useOutboxCount() + useDraftCount();

  return (
    <div className="grid gap-6">
      <SectionHeader
        title="Sign out"
        description="Sign out of Cadence on this device."
      />

      <p className="text-muted-foreground text-(length:--cd-text-ui) leading-relaxed">
        {pending > 0
          ? `${pending} change${pending === 1 ? '' : 's'} haven’t synced yet. They stay on this device and sync the next time you sign in here.`
          : 'Everything is synced.'}
      </p>

      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Hand over to the sign-out confirmation (final sync + redirect).
            setSettingsOpen(false);
            setSignOutModalOpen(true);
          }}
        >
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
