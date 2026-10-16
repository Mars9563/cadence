import { Orb } from '@yogesharc/thinking-orbs';
import { Lock } from 'lucide-react';

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
        'group -mx-2 flex min-h-13 items-center gap-3 rounded-md px-2 py-2.5',
        'transition-colors duration-(--cd-duration-fast)',
        !locked && 'hover:bg-fill-hover',
      )}
    >
      <div className="flex size-5 shrink-0 items-center justify-center">
        {loading ? (
          <Orb
            state="reasoning"
            size={18}
            label="Completing"
            className="text-primary"
          />
        ) : locked ? (
          <div
            className="text-faint-foreground flex size-5 items-center justify-center"
            role="img"
            aria-label="Locked"
            title="Locked"
          >
            <Lock aria-hidden="true" className="size-3.5" />
          </div>
        ) : (
          <Checkbox
            checked={checked}
            disabled={!onCheckedChange}
            onCheckedChange={onCheckedChange}
            aria-label={title}
            // The default input border is too faint to find on the canvas.
            className="border-faint-foreground group-hover:border-muted-foreground"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          title={title}
          className={cn(
            'text-foreground truncate text-(length:--cd-text-control)',
            checked &&
              'text-muted-foreground decoration-faint-foreground line-through',
            locked && 'text-muted-foreground',
          )}
        >
          {title}
        </p>

        {description ? (
          <p className="text-muted-foreground mt-0.5 truncate text-(length:--cd-text-meta)">
            {description}
          </p>
        ) : null}
      </div>

      {meta.length > 0 ? (
        <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-(length:--cd-text-meta)">
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
