'use client';

import { useId } from 'react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { FieldErrors } from '@/lib/formErrors';
import { FormField, fieldA11y } from './FormField';

interface TitleDescriptionFieldsProps {
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  errors: FieldErrors;
  disabled?: boolean;
  titlePlaceholder?: string;
}

// Limits mirror titleSchema / descriptionSchema in @cadence/validation.
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;

export function TitleDescriptionFields({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  errors,
  disabled,
  titlePlaceholder,
}: TitleDescriptionFieldsProps) {
  const uid = useId();

  return (
    <>
      <FormField id={`${uid}-title`} label="Title" error={errors.title}>
        <Input
          {...fieldA11y(`${uid}-title`, errors.title)}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={titlePlaceholder}
          maxLength={TITLE_MAX}
          disabled={disabled}
          autoComplete="off"
        />
      </FormField>

      <FormField
        id={`${uid}-description`}
        label="Description"
        optional
        error={errors.description}
      >
        <Textarea
          {...fieldA11y(`${uid}-description`, errors.description)}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          maxLength={DESCRIPTION_MAX}
          rows={3}
          disabled={disabled}
        />
      </FormField>
    </>
  );
}
