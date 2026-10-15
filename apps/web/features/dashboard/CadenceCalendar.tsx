'use client';

import type { CSSProperties } from 'react';

import {
  DayButton,
  DayPicker,
  type ChevronProps,
  type DayButtonProps,
} from '@daypicker/react';

import { MdChevronLeft, MdChevronRight, MdEvent } from 'react-icons/md';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { cn } from '@/lib/utils';

import { useCadenceToday } from '@/hooks/useCadenceToday';

import {
  cadenceDateToLocalDate,
  getHistoryDayStats,
  getMaxNormalCompletions,
  localDateToCadenceDate,
} from '@/lib/history';

import {
  useDayEndTime,
  useHabitCompletions,
  useHabitItems,
  useNormalItems,
  useSelectedDate,
  useSetSelectedDate,
  useTaskItems,
} from '@/store/selectors';

const CALENDAR_STYLE = {
  '--rdp-day-height': '44px',
  '--rdp-day-width': '44px',
  '--rdp-day_button-height': '40px',
  '--rdp-day_button-width': '40px',
  '--rdp-nav_button-height': '32px',
  '--rdp-nav_button-width': '32px',
} as CSSProperties;

function scoreOpacity(score: number): number {
  return 0.18 + score * 0.82;
}

function CalendarChevron({ orientation, className, size }: ChevronProps) {
  if (orientation === 'left') {
    return (
      <MdChevronLeft
        className={className}
        size={size ?? 20}
        aria-hidden="true"
      />
    );
  }

  if (orientation === 'right') {
    return (
      <MdChevronRight
        className={className}
        size={size ?? 20}
        aria-hidden="true"
      />
    );
  }

  return (
    <MdChevronRight
      className={className}
      size={size ?? 20}
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

  const dayEndTime = useDayEndTime();

  const todayDate = cadenceDateToLocalDate(today);

  const selected = selectedDate
    ? cadenceDateToLocalDate(selectedDate)
    : undefined;

  const maxNormalCompletions = getMaxNormalCompletions(normalItems, dayEndTime);

  function HistoryDayButton(props: DayButtonProps) {
    const date = localDateToCadenceDate(props.day.date);

    const stats = getHistoryDayStats(
      date,
      normalItems,
      taskItems,
      habitItems,
      habitCompletions,
      dayEndTime,
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
          'flex flex-col gap-0.5 rounded-xl leading-none transition-colors',
        )}
      >
        <span>{props.children}</span>

        <span
          className="pointer-events-none flex items-center gap-0.5"
          aria-hidden="true"
        >
          <span
            className="size-1 rounded-full bg-emerald-500"
            style={{
              opacity: scoreOpacity(stats.habit.score),
            }}
          />

          <span
            className="size-1 rounded-full bg-blue-500"
            style={{
              opacity: scoreOpacity(stats.task.score),
            }}
          />

          <span
            className="size-1 rounded-full bg-amber-500"
            style={{
              opacity: scoreOpacity(stats.normal.score),
            }}
          />
        </span>
      </DayButton>
    );
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-8 items-center justify-center rounded-lg border">
              <MdEvent className="text-muted-foreground" size={17} />
            </div>

            <div>
              <CardTitle className="text-sm">Calendar</CardTitle>

              <p className="text-muted-foreground mt-0.5 text-[10px]">
                Review your cadence history
              </p>
            </div>
          </div>

          <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
            History
          </span>
        </div>
      </CardHeader>

      <CardContent className="min-w-0 px-3 pt-1 pb-4">
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

            // THIS IS THE IMPORTANT CHANGE
            month: 'grid w-full grid-cols-[auto_1fr_auto]',

            month_caption: 'flex h-10 min-w-0 items-center justify-center',

            caption_label: 'text-sm font-semibold tracking-tight',

            // nav is irrelevant with this DayPicker layout
            nav: '',

            button_previous:
              'inline-flex size-8 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',

            button_next:
              'inline-flex size-8 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',

            weekdays: 'w-full',

            weekday:
              'text-muted-foreground py-2 text-center text-[10px] font-semibold uppercase tracking-wider',

            // THIS MAKES THE TABLE THE SECOND ROW
            month_grid: 'col-span-3 w-full table-fixed border-collapse',

            week: 'w-full',

            day: 'h-11 p-0 text-center align-middle',

            day_button:
              'mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-xs font-medium transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',

            selected:
              'bg-background text-primary-foreground hover:bg-background rounded-2xl',

            today: 'bg-muted text-foreground font-semibold ring-1 ring-border',

            disabled: 'text-muted-foreground/35 cursor-not-allowed',

            outside: 'text-muted-foreground/30',
          }}
          components={{
            DayButton: HistoryDayButton,
            Chevron: CalendarChevron,
          }}
        />

        <div className="border-t pt-3">
          <div className="text-muted-foreground flex items-center justify-center gap-4 text-[9px] font-medium tracking-wider uppercase">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Habits
            </span>

            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-blue-500" />
              Tasks
            </span>

            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Normal
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
