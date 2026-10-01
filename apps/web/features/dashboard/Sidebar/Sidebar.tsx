'use client';

import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/features/auth/SignOutButton';
import { SignOutDialog } from '@/features/auth/SignOutDialog';
import { MdDashboard } from 'react-icons/md';
import { MdNotes } from 'react-icons/md';
import { MdSettings } from 'react-icons/md';

export function Sidebar() {
  return (
    <>
      <aside className="bg-secondary flex w-52 flex-col rounded-2xl border p-3">
        <div className="flex flex-col gap-1">
          <Button
            variant="secondary"
            className="w-full justify-start rounded-xl"
          >
            <div className="flex flex-row items-center justify-center gap-2">
              <MdDashboard /> <p>Dashboard</p>
            </div>
          </Button>

          <Button variant="secondary" className="w-full justify-start rounded-xl">
            <div className="flex flex-row items-center justify-center gap-2">
              <MdNotes /> <p>Notes</p>
            </div>
          </Button>

          <Button variant="secondary" className="w-full justify-start rounded-xl">
            <div className="flex flex-row items-center justify-center gap-2">
              <MdSettings /> <p>Settings</p>
            </div>
          </Button>
        </div>

        <div className="mt-auto border-t pt-3">
          <SignOutButton />
        </div>
      </aside>

      <SignOutDialog />
    </>
  );
}
