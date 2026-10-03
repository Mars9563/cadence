'use client';

import { useId } from 'react';
import type { Weekday } from '@cadence/types';
import { WEEKDAYS } from '@cadence/validation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FieldErrors } from '@/lib/formErrors';
import { WEEKDAY_SHORT } from '@/lib/itemFormat';
import { FormField, fieldA11y } from './FormField';

export type RecurrenceKind = 'daily' | 'weekly';

interface RecurrenceFieldsProps {
  kind: RecurrenceKind;
  onKindChange: (kind: RecurrenceKind) => void;

  days: Weekday[];
  onDaysChange: (days: Weekday[]) => void;

  startDate: string;
  onStartDateChange: (value: string) => void;

  endDate: string;
  onEndDateChange: (value: string) => void;
  /** Earliest selectable end date. */
  endDateMin: string;

  errors: FieldErrors;
  disabled?: boolean;
}

const KIND_OPTIONS: { value: RecurrenceKind; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Selected days' },
];

export function RecurrenceFields({
  kind,
  onKindChange,
  days,
  onDaysChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  endDateMin,
  errors,
  disabled,
}: RecurrenceFieldsProps) {
  const uid = useId();

  function toggleDay(day: Weekday) {
    onDaysChange(
      days.includes(day)
        ? days.filter((value) => value !== day)
        : [...days, day].sort((a, b) => a - b),
    );
  }

  return (
    <>
      <div className="grid gap-2">
        <span className="text-sm leading-none font-medium">Repeats</span>

        <div role="group" aria-label="Repeats" className="flex gap-2">
          {KIND_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={kind === option.value ? 'default' : 'outline'}
              aria-pressed={kind === option.value}
              disabled={disabled}
              onClick={() => onKindChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {kind === 'weekly' ? (
        <div className="grid gap-2">
          <span className="text-sm leading-none font-medium">On</span>

          <div role="group" aria-label="Days of the week" className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <Button
                key={day}
                type="button"
                size="sm"
                variant={days.includes(day) ? 'default' : 'outline'}
                aria-pressed={days.includes(day)}
                disabled={disabled}
                onClick={() => toggleDay(day)}
              >
                {WEEKDAY_SHORT[day]}
              </Button>
            ))}
          </div>

          {errors['recurrence.days'] ? (
            <p role="alert" className="text-destructive text-sm">
              {errors['recurrence.days']}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <FormField
          id={`${uid}-start`}
          label="Starts"
          error={errors['recurrence.startDate']}
        >
          <Input
            {...fieldA11y(`${uid}-start`, errors['recurrence.startDate'])}
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            disabled={disabled}
          />
        </FormField>

        <FormField
          id={`${uid}-end`}
          label="Ends"
          optional
          error={errors['recurrence.endDate']}
        >
          <Input
            {...fieldA11y(`${uid}-end`, errors['recurrence.endDate'])}
            type="date"
            value={endDate}
            min={endDateMin}
            onChange={(event) => onEndDateChange(event.target.value)}
            disabled={disabled}
          />
        </FormField>
      </div>
    </>
  );
}
