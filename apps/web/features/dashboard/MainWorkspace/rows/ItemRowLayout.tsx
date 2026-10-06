import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Orb } from '@yogesharc/thinking-orbs';
import { MdLock } from 'react-icons/md';

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
    <div className="flex items-center gap-3 px-4 py-3">
      {loading ? (
        <div
          className="flex size-5 items-center justify-center"
          aria-label="Completing"
        >
          <Orb state="reasoning" size={20} label="Completing" />
        </div>
      ) : locked ? (
        <div
          className="text-muted-foreground flex size-5 items-center justify-center"
          aria-label="Locked"
          title="Locked"
        >
          <MdLock size={18} />
        </div>
      ) : (
        <Checkbox
          checked={checked}
          disabled={!onCheckedChange}
          onCheckedChange={onCheckedChange}
          aria-label={title}
        />
      )}

      <div className="min-w-0 flex-1">
        <p
          title={title}
          className={cn(
            'truncate text-sm',
            checked && 'text-muted-foreground line-through',
            locked && 'text-muted-foreground',
          )}
        >
          {title}
        </p>

        {description ? (
          <p className="text-muted-foreground truncate text-xs">
            {description}
          </p>
        ) : null}
      </div>

      {meta.length > 0 ? (
        <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs">
          {meta.map((part, index) => (
            <span key={index} className="tabular-nums">
              {part}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
