'use client';

import type { CSSProperties } from 'react';

import {
  DayButton,
  DayPicker,
  type ChevronProps,
  type DayButtonProps,
} from '@daypicker/react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

import { useCadenceToday } from '@/hooks/useCadenceToday';

import {
  cadenceDateToLocalDate,
  getHistoryDayStats,
  getMaxNormalCompletions,
  localDateToCadenceDate,
} from '@/lib/history';

import {
  useHabitCompletions,
  useHabitItems,
  useNormalItems,
  useSelectedDate,
  useSetSelectedDate,
  useTaskItems,
} from '@/store/selectors';

const CALENDAR_STYLE = {
  '--rdp-day-height': '40px',
  '--rdp-day-width': '40px',
  '--rdp-day_button-height': '36px',
  '--rdp-day_button-width': '36px',
  '--rdp-nav_button-height': '28px',
  '--rdp-nav_button-width': '28px',
} as CSSProperties;

/* The three series, in the order their dots appear under each day. */
const SERIES = [
  { key: 'habit', label: 'Habits', color: 'bg-(--cd-series-habit)' },
  { key: 'task', label: 'Tasks', color: 'bg-(--cd-series-task)' },
  { key: 'normal', label: 'Normal', color: 'bg-(--cd-series-normal)' },
] as const;

const NAV_BUTTON =
  'text-muted-foreground hover:bg-fill-hover hover:text-foreground inline-flex size-7 items-center justify-center rounded-md transition-colors duration-(--cd-duration-fast) outline-none focus-visible:ring-1 focus-visible:ring-primary/60 disabled:opacity-40';

function scoreOpacity(score: number): number {
  return 0.18 + score * 0.82;
}

function CalendarChevron({ orientation, className, size }: ChevronProps) {
  const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;

  return (
    <Icon
      className={cn('size-4', className)}
      size={size}
      aria-hidden="true"
    />
  );
}

export function CadenceCalendar() {
  const today = useCadenceToday();

  const selectedDate = useSelectedDate();
  const setSelectedDate = useSetSelectedDate();

  const normalItems = useNormalItems();
  const taskItems = useTaskItems();
  const habitItems = useHabitItems();
  const habitCompletions = useHabitCompletions();

  const todayDate = cadenceDateToLocalDate(today);

  const selected = selectedDate
    ? cadenceDateToLocalDate(selectedDate)
    : undefined;

  const maxNormalCompletions = getMaxNormalCompletions(normalItems);

  function HistoryDayButton(props: DayButtonProps) {
    const date = localDateToCadenceDate(props.day.date);

    const stats = getHistoryDayStats(
      date,
      normalItems,
      taskItems,
      habitItems,
      habitCompletions,
      maxNormalCompletions,
    );

    const title = [
      `Habits ${stats.habit.completed}/${stats.habit.expected}`,
      `Tasks ${stats.task.completed}/${stats.task.expected}`,
      `Normal ${stats.normal.completed}${
        stats.normal.expected > 0 ? `/${stats.normal.expected}` : ''
      }`,
    ].join(' · ');

    return (
      <DayButton
        {...props}
        title={title}
        className={cn(
          props.className,
          'flex flex-col gap-1 leading-none',
        )}
      >
        <span>{props.children}</span>

        <span
          className="pointer-events-none flex items-center gap-0.5"
          aria-hidden="true"
        >
          {SERIES.map((series) => (
            <span
              key={series.key}
              className={cn('size-1 rounded-full', series.color)}
              style={{ opacity: scoreOpacity(stats[series.key].score) }}
            />
          ))}
        </span>
      </DayButton>
    );
  }

  return (
    <section aria-labelledby="cadence-calendar-title" className="min-w-0 px-4 pt-5 pb-5">
      <div className="mb-2 px-1">
        <h2
          id="cadence-calendar-title"
          className="text-foreground text-(length:--cd-text-ui) font-medium"
        >
          Calendar
        </h2>

        <p className="text-muted-foreground mt-0.5 text-(length:--cd-text-meta)">
          Pick a past day to review it.
        </p>
      </div>

      <DayPicker
        mode="single"
        defaultMonth={todayDate}
        selected={selected}
        onSelect={(date) =>
          setSelectedDate(date ? localDateToCadenceDate(date) : null)
        }
        today={todayDate}
        disabled={{ after: todayDate }}
        navLayout="around"
        className="w-full"
        style={CALENDAR_STYLE}
        classNames={{
          root: 'w-full',
          months: 'w-full',

          // Caption between the two nav buttons, the day grid as a second row.
          month: 'grid w-full grid-cols-[auto_1fr_auto] items-center',

          month_caption: 'flex h-9 min-w-0 items-center justify-center',

          caption_label: 'text-(length:--cd-text-ui) font-medium text-foreground',

          nav: '',

          button_previous: NAV_BUTTON,

          button_next: NAV_BUTTON,

          weekdays: 'w-full',

          weekday:
            'text-muted-foreground py-2 text-center text-[11px] font-normal',

          month_grid: 'col-span-3 w-full table-fixed border-collapse',

          week: 'w-full',

          day: 'h-10 p-0 text-center align-middle',

          day_button:
            'mx-auto flex size-9 items-center justify-center rounded-md text-(length:--cd-text-ui) text-foreground transition-colors duration-(--cd-duration-fast) hover:bg-fill-hover outline-none focus-visible:ring-1 focus-visible:ring-primary/60',

          // These land on the day cell; style the button inside it.
          selected:
            '[&>button]:bg-fill-selected [&>button]:ring-1 [&>button]:ring-primary/70',

          today: '[&>button]:text-primary [&>button]:font-semibold',

          disabled:
            'cursor-not-allowed [&>button]:text-faint-foreground [&>button]:opacity-50 [&>button]:hover:bg-transparent',

          outside: '[&>button]:text-faint-foreground',
        }}
        components={{
          DayButton: HistoryDayButton,
          Chevron: CalendarChevron,
        }}
      />

      <ul
        aria-label="Dot colours"
        className="text-muted-foreground mt-3 flex items-center justify-center gap-4 border-t border-border/70 pt-3 text-(length:--cd-text-meta)"
      >
        {SERIES.map((series) => (
          <li key={series.key} className="flex items-center gap-1.5">
            <span className={cn('size-1.5 rounded-full', series.color)} />
            {series.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
