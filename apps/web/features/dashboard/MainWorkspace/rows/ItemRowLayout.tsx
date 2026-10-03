import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface ItemRowLayoutProps {
  title: string;
  description?: string | null;
  /** Small muted pieces on the right, e.g. ['Mon Wed Fri', '07:00']. */
  meta?: string[];
  checked?: boolean;
}

/**
 * Shared row shell for habits, tasks and normal items.
 *
 * The checkbox is display-only for now (completion is intentionally not
 * wired yet). To enable it later, add an `onCheckedChange` prop and drop
 * `disabled`.
 */
export function ItemRowLayout({
  title,
  description,
  meta = [],
  checked = false,
}: ItemRowLayoutProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Checkbox checked={checked} disabled aria-label={title} />

      <div className="min-w-0 flex-1">
        <p
          title={title}
          className={cn(
            'truncate text-sm',
            checked && 'text-muted-foreground line-through',
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
