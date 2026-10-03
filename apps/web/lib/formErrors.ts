import type { ZodError } from 'zod';

/** Field path ('title', 'recurrence.days', ...) -> first error message. */
export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: ZodError): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.');

    if (!(key in errors)) {
      errors[key] = issue.message;
    }
  }

  return errors;
}
