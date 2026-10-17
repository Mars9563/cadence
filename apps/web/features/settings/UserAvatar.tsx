'use client';

import { cn } from '@/lib/utils';
import { getInitials } from '@/features/dashboard/TopBar';
import { useUser } from '@/store/selectors';

/**
 * The signed-in user's picture, always round: the uploaded avatar (signed
 * URL), else the Google/GitHub one, else initials.
 */
export function UserAvatar({ className }: { className?: string }) {
  const user = useUser();

  return (
    <span
      className={cn(
        'bg-fill-selected text-muted-foreground flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium select-none',
        className,
      )}
    >
      {user?.avatarSrc ? (
        // Signed Cloudinary or provider URLs: plain <img>, no Next optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarSrc} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{getInitials(user?.displayName, user?.email)}</span>
      )}
    </span>
  );
}
