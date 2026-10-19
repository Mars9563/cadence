'use client';

import { useId, useState } from 'react';
import { createTaskItemSchema } from '@cadence/validation';

import { Input } from '@/components/ui/input';
import { getCadenceDate } from '@/lib/cadenceDate';
import { toUserMessage } from '@/lib/errors';
import { toFieldErrors, type FieldErrors } from '@/lib/formErrors';
import { useAddTaskItem, useDaySettings } from '@/store/selectors';
import { FormField, fieldA11y } from './FormField';
import { ItemDialog } from './ItemDialog';
import { ItemFormFrame } from './ItemFormFrame';
import { TitleDescriptionFields } from './TitleDescriptionFields';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTaskDialog({ open, onOpenChange }: DialogProps) {
  return (
    <ItemDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add task"
      description="Something to do on a specific day. A task can't be changed once its day has passed."
    >
      <AddTaskForm onDone={() => onOpenChange(false)} />
    </ItemDialog>
  );
}

function AddTaskForm({ onDone }: { onDone: () => void }) {
  const uid = useId();
  const addTaskItem = useAddTaskItem();
  const daySettings = useDaySettings();

  // Form state is created when the dialog opens, so "today" is fresh.
  const [today] = useState(() => getCadenceDate(new Date(), daySettings));

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(today);
  const [scheduledTime, setScheduledTime] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const parsed = createTaskItemSchema.safeParse({
      kind: 'task',
      title,
      description: description.trim() || null,
      scheduledDate,
      scheduledTime: scheduledTime || null,
    });

    const nextErrors: FieldErrors = parsed.success
      ? {}
      : toFieldErrors(parsed.error);

    if (!scheduledDate) {
      nextErrors.scheduledDate = 'Pick a date.';
    } else if (scheduledDate < getCadenceDate(new Date(), daySettings)) {
      // Mirrors the items RLS rule: tasks cannot be created in the past.
      nextErrors.scheduledDate = 'A task can\u2019t be scheduled in the past.';
    }

    if (!parsed.success || Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      await addTaskItem(parsed.data);
      onDone();
    } catch (error) {
      setFormError(
        toUserMessage(error, 'Could not add the task. Please try again.'),
      );
      setSubmitting(false);
    }
  }

  return (
    <ItemFormFrame
      submitLabel="Add task"
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
        titlePlaceholder="Finish project report"
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          id={`${uid}-date`}
          label="Date"
          error={errors.scheduledDate}
        >
          <Input
            {...fieldA11y(`${uid}-date`, errors.scheduledDate)}
            type="date"
            value={scheduledDate}
            min={today}
            onChange={(event) => setScheduledDate(event.target.value)}
            disabled={submitting}
          />
        </FormField>

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
      </div>
    </ItemFormFrame>
  );
}
