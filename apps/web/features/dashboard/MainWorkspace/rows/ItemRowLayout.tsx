import { Orb } from '@yogesharc/thinking-orbs';
import { MdLock } from 'react-icons/md';

import { Checkbox } from '@/components/ui/checkbox';

import { cn } from '@/lib/utils';

interface ItemRowLayoutProps {
  title: string;
  description?: string | null;

  meta?: string[];

  checked?: boolean;

  loading?: boolean;

  /**
   * Historical item that was expected but was not completed.
   */
  locked?: boolean;

  onCheckedChange?: (checked: boolean) => void;
}

export function ItemRowLayout({
  title,
  description,
  meta = [],
  checked = false,
  loading = false,
  locked = false,
  onCheckedChange,
}: ItemRowLayoutProps) {
  return (
    <div
      className={cn(
        'group flex min-h-16 items-center gap-3 px-4 py-3.5',
        'transition-colors',
        !locked && 'hover:bg-muted/35',
        locked && 'bg-muted/10',
      )}
    >
      <div className="flex size-5 shrink-0 items-center justify-center">
        {loading ? (
          <Orb state="reasoning" size={20} label="Completing" />
        ) : locked ? (
          <div
            className="text-muted-foreground flex size-5 items-center justify-center"
            aria-label="Locked"
            title="Locked"
          >
            <MdLock size={17} />
          </div>
        ) : (
          <Checkbox
            checked={checked}
            disabled={!onCheckedChange}
            onCheckedChange={onCheckedChange}
            aria-label={title}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          title={title}
          className={cn(
            'truncate text-sm font-medium',
            checked && 'text-muted-foreground line-through',
            locked && 'text-muted-foreground',
          )}
        >
          {title}
        </p>

        {description ? (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {description}
          </p>
        ) : null}
      </div>

      {meta.length > 0 ? (
        <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-[10px] sm:gap-3 sm:text-xs">
          {meta.map((part, index) => (
            <span key={index} className="whitespace-nowrap tabular-nums">
              {part}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
