'use client';

import { MdLogout } from 'react-icons/md';

import { useSetSignOutModalOpen } from '@/store/selectors';

export function SignOutButton() {
  const setSignOutModalOpen = useSetSignOutModalOpen();

  return (
    <button
      type="button"
      onClick={() => setSignOutModalOpen(true)}
      className="text-muted-foreground hover:bg-background hover:text-foreground flex w-full items-center justify-center gap-2 rounded-xl p-2.5 transition-colors"
    >
      <MdLogout size={22} />

      <span className="text-sm font-medium">Logout</span>
    </button>
  );
}
