/**
 * Socket.IO acknowledgement helpers.
 *
 * Handlers accept an optional ack callback as their last argument. The web
 * client's sync engine always sends one (emitWithAck) so it can match a reply
 * to the exact request; older clients that only listen for the broadcast
 * events keep working because the events are still emitted.
 */
export type Ack<T> = ((response: T) => void) | undefined;

export type AckResult<T> = { ok: true; data: T } | { ok: false; code: string };

export function reply<T>(ack: unknown, response: AckResult<T>) {
  if (typeof ack === 'function') {
    (ack as (response: AckResult<T>) => void)(response);
  }
}

export function errorCode(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
