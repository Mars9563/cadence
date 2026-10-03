'use client';

import { useState } from 'react';
import { createNormalItemSchema } from '@cadence/validation';

import { toUserMessage } from '@/lib/errors';
import { toFieldErrors, type FieldErrors } from '@/lib/formErrors';
import { useAddNormalItem } from '@/store/selectors';
import { ItemDialog } from './ItemDialog';
import { ItemFormFrame } from './ItemFormFrame';
import { TitleDescriptionFields } from './TitleDescriptionFields';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddNormalItemDialog({ open, onOpenChange }: DialogProps) {
  return (
    <ItemDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add item"
      description="Something to handle sometime. No date, no pressure."
    >
      <AddNormalItemForm onDone={() => onOpenChange(false)} />
    </ItemDialog>
  );
}

function AddNormalItemForm({ onDone }: { onDone: () => void }) {
  const addNormalItem = useAddNormalItem();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const parsed = createNormalItemSchema.safeParse({
      kind: 'normal',
      title,
      description: description.trim() || null,
    });

    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      await addNormalItem(parsed.data);
      onDone();
    } catch (error) {
      setFormError(
        toUserMessage(error, 'Could not add the item. Please try again.'),
      );
      setSubmitting(false);
    }
  }

  return (
    <ItemFormFrame
      submitLabel="Add item"
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
        titlePlaceholder="Buy groceries"
      />
    </ItemFormFrame>
  );
}
