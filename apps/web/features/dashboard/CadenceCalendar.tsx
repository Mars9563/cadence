'use client';

import type { CSSProperties } from 'react';

import { DayButton, DayPicker, type DayButtonProps } from '@daypicker/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  '--rdp-day-height': '38px',
  '--rdp-day-width': '38px',
  '--rdp-day_button-height': '36px',
  '--rdp-day_button-width': '36px',
  '--rdp-nav_button-height': '30px',
  '--rdp-nav_button-width': '30px',
} as CSSProperties;

function scoreOpacity(score: number): number {
  return 0.18 + score * 0.82;
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
        className={`${props.className ?? ''} flex-col gap-0.5 leading-none`}
      >
        <span>{props.children}</span>

        <span
          className="pointer-events-none flex items-center gap-0.5"
          aria-hidden="true"
        >
          {/* Habit */}
          <span
            className="size-1 rounded-full bg-emerald-500"
            style={{
              opacity: scoreOpacity(stats.habit.score),
            }}
          />

          {/* Task */}
          <span
            className="size-1 rounded-full bg-blue-500"
            style={{
              opacity: scoreOpacity(stats.task.score),
            }}
          />

          {/* Normal */}
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
      <CardHeader className="pb-2">
        <CardTitle>Calendar</CardTitle>
      </CardHeader>

      <CardContent className="min-w-0 px-2 pb-3 sm:px-3">
        <div className="w-full min-w-0">
          <DayPicker
            mode="single"
            defaultMonth={todayDate}
            selected={selected}
            onSelect={(date) =>
              setSelectedDate(date ? localDateToCadenceDate(date) : null)
            }
            today={todayDate}
            disabled={{ after: todayDate }}
            className="w-full"
            style={CALENDAR_STYLE}
            styles={{
              months: {
                width: '100%',
              },
              month: {
                width: '100%',
              },
              month_grid: {
                width: '100%',
              },
            }}
            components={{
              DayButton: HistoryDayButton,
            }}
          />
        </div>

        <div className="text-muted-foreground mt-2 flex items-center justify-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Habits
          </span>

          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-blue-500" />
            Tasks
          </span>

          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Normal
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
