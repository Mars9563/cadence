import { Socket } from 'socket.io';

import type { DailyNoteSaveAck } from '@cadence/types';

import {
  createTodayDailyNoteSchema,
  dailyNoteIdParamsSchema,
  updateDailyNoteSchema,
} from '@cadence/validation';

import {
  addDailyNoteByUserId,
  updateDailyNoteById,
} from '../../services/daily-notes.services';
import { errorCode, reply } from '../ack';

type UpdateDailyNotePayload = {
  noteId: string;
  content: string;
  saveId: number;
};

export function registerDailyNotesHandlers(
  socket: Socket,
) {
  /*
   * Create today's empty Daily Note.
   *
   * No payload is accepted.
   *
   * The service determines the user's current Cadence date.
   */
  socket.on(
    'daily-note:create',
    async (payload: unknown, ack?: unknown) => {
      try {
        const body = createTodayDailyNoteSchema.safeParse(payload ?? {});

        const result = await addDailyNoteByUserId(
          socket.data.userId,
          socket.data.token,
          body.success ? body.data.id : undefined,
        );

        const dailyNote = result.data?.dailyNote;

        reply(ack, { ok: true, data: { dailyNote } });
      } catch (error) {
        const code = errorCode(error, 'DAILY_NOTE_CREATE_FAILED');

        console.error('Failed to create daily note:', code);

        reply(ack, { ok: false, code });
      }
    },
  );

  /*
   * Update an existing Daily Note.
   *
   * Client sends only:
   *
   * {
   *   noteId,
   *   content,
   *   saveId   // client-chosen, monotonically increasing per save attempt
   * }
   *
   * On success the server replies with a minimal acknowledgement
   * (`{ ok: true, data: { noteId, saveId } }` on the ack). The document itself is
   * never echoed back: the client's editor stays the source of truth.
   *
   * Every failure is reported on the same ack as `{ ok: false, code }`.
   */
  socket.on(
    'daily-note:update',
    async (payload: UpdateDailyNotePayload, ack?: unknown) => {
      const saveId =
        Number.isSafeInteger(payload?.saveId) && payload.saveId >= 0
          ? payload.saveId
          : undefined;

      const fail = (code: string) => reply(ack, { ok: false, code });

      try {
        if (saveId === undefined) {
          fail('INVALID_SAVE_ID');

          return;
        }

        const paramsResult =
          dailyNoteIdParamsSchema.safeParse({
            id: payload?.noteId,
          });

        if (!paramsResult.success) {
          fail('INVALID_DAILY_NOTE_ID');

          return;
        }

        const bodyResult =
          updateDailyNoteSchema.safeParse({
            content: payload?.content,
          });

        if (!bodyResult.success) {
          fail('INVALID_DAILY_NOTE_CONTENT');

          return;
        }

        await updateDailyNoteById(
          paramsResult.data.id,
          bodyResult.data.content,
          socket.data.token,
        );

        const saved: DailyNoteSaveAck = {
          noteId: paramsResult.data.id,
          saveId,
        };

        reply(ack, { ok: true, data: saved });
      } catch (error) {
        console.error(
          'Failed to update daily note:',
          error,
        );

        fail(
          error instanceof Error
            ? error.message
            : 'DAILY_NOTE_UPDATE_FAILED',
        );
      }
    },
  );
}
