'use client';

import { useId, useState } from 'react';
import type { Weekday } from '@cadence/types';
import { createHabitItemSchema } from '@cadence/validation';

import { Input } from '@/components/ui/input';
import { getCadenceDate } from '@/lib/cadenceDate';
import { toUserMessage } from '@/lib/errors';
import { toFieldErrors, type FieldErrors } from '@/lib/formErrors';
import { useAddHabitItem, useDayEndTime } from '@/store/selectors';
import { FormField, fieldA11y } from './FormField';
import { ItemDialog } from './ItemDialog';
import { ItemFormFrame } from './ItemFormFrame';
import { RecurrenceFields, type RecurrenceKind } from './RecurrenceFields';
import { TitleDescriptionFields } from './TitleDescriptionFields';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddHabitDialog({ open, onOpenChange }: DialogProps) {
  return (
    <ItemDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add habit"
      description="Something you want to do again and again. Pick how often it repeats."
    >
      <AddHabitForm onDone={() => onOpenChange(false)} />
    </ItemDialog>
  );
}

function AddHabitForm({ onDone }: { onDone: () => void }) {
  const uid = useId();
  const addHabitItem = useAddHabitItem();
  const dayEndTime = useDayEndTime();

  const [today] = useState(() => getCadenceDate(new Date(), dayEndTime));

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [kind, setKind] = useState<RecurrenceKind>('daily');
  const [days, setDays] = useState<Weekday[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // An end date can't precede the start date, nor be in the past.
  const endDateMin = startDate && startDate > today ? startDate : today;

  async function handleSubmit() {
    const parsed = createHabitItemSchema.safeParse({
      kind: 'habit',
      title,
      description: description.trim() || null,
      scheduledTime: scheduledTime || null,
      recurrence: {
        kind,
        days: kind === 'weekly' ? days : null,
        startDate,
        endDate: endDate || null,
      },
    });

    const nextErrors: FieldErrors = parsed.success
      ? {}
      : toFieldErrors(parsed.error);

    if (!startDate) {
      nextErrors['recurrence.startDate'] = 'Pick a start date.';
    }

    // Mirrors the items RLS rule: an already-ended habit can't be created.
    if (endDate && endDate < getCadenceDate(new Date(), dayEndTime)) {
      nextErrors['recurrence.endDate'] = 'The end date can\u2019t be in the past.';
    }

    if (!parsed.success || Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      await addHabitItem(parsed.data);
      onDone();
    } catch (error) {
      setFormError(
        toUserMessage(error, 'Could not add the habit. Please try again.'),
      );
      setSubmitting(false);
    }
  }

  return (
    <ItemFormFrame
      submitLabel="Add habit"
      submitting={submitting}
      formError={formError}
      onSubmit={handleSubmit}
      onCancel={onDone}
    >
      <TitleDescriptionFields
        title={title}
        onTitleChange={setTitle}
        description={description}
        onDescriptionChange={setDescription}
        errors={errors}
        disabled={submitting}
        titlePlaceholder="Read 10 pages"
      />

      <FormField
        id={`${uid}-time`}
        label="Time"
        optional
        error={errors.scheduledTime}
      >
        <Input
          {...fieldA11y(`${uid}-time`, errors.scheduledTime)}
          type="time"
          value={scheduledTime}
          onChange={(event) => setScheduledTime(event.target.value)}
          disabled={submitting}
        />
      </FormField>

      <RecurrenceFields
        kind={kind}
        onKindChange={setKind}
        days={days}
        onDaysChange={setDays}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        endDateMin={endDateMin}
        errors={errors}
        disabled={submitting}
      />
    </ItemFormFrame>
  );
}
