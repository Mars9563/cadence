/**
 * The api/ helpers throw `result.error`, which for failures is a machine code
 * from the backend ('VALIDATION_ERROR', 'INTERNAL_SERVER_ERROR', ...).
 * Codes are not user-facing, so fall back to a readable sentence.
 */
export function toUserMessage(error: unknown, fallback: string): string {
  if (
    error instanceof Error &&
    error.message &&
    !/^[A-Z0-9_]+$/.test(error.message)
  ) {
    return error.message;
  }

  return fallback;
}
