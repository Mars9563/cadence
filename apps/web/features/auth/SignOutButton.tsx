'use client';

import { LogOut } from 'lucide-react';

import { useSetSignOutModalOpen } from '@/store/selectors';

export function SignOutButton() {
  const setSignOutModalOpen = useSetSignOutModalOpen();

  return (
    <button
      type="button"
      onClick={() => setSignOutModalOpen(true)}
      className="text-muted-foreground hover:bg-fill-hover hover:text-foreground focus-visible:ring-primary/60 flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-(length:--cd-text-ui) transition-colors duration-(--cd-duration-fast) outline-none focus-visible:ring-1"
    >
      <LogOut aria-hidden="true" className="size-4" />

      <span>Sign out</span>
    </button>
  );
}
