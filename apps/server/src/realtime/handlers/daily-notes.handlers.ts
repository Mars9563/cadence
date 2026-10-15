import { Socket } from 'socket.io';

import type { DailyNoteSaveAck } from '@cadence/types';

import {
  dailyNoteIdParamsSchema,
  updateDailyNoteSchema,
} from '@cadence/validation';

import {
  addDailyNoteByUserId,
  updateDailyNoteById,
} from '../../services/daily-notes.services';

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
    async () => {
      try {
        const result = await addDailyNoteByUserId(
          socket.data.userId,
          socket.data.token,
        );

        socket.emit('daily-note:created', {
          dailyNote: result.data?.dailyNote,
        });
      } catch (error) {
        console.error(
          'Failed to create daily note:',
          error,
        );

        socket.emit('daily-note:operation:failed', {
          operation: 'create',
          code:
            error instanceof Error
              ? error.message
              : 'DAILY_NOTE_CREATE_FAILED',
        });
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
   * (`daily-note:saved` with `{ noteId, saveId }`). The document itself is
   * never echoed back: the client's editor stays the source of truth.
   *
   * Every failure is reported on `daily-note:operation:failed` and carries
   * `noteId` / `saveId` (when they were well-formed) so the client can match
   * it to the save attempt it belongs to.
   */
  socket.on(
    'daily-note:update',
    async (payload: UpdateDailyNotePayload) => {
      const noteId =
        typeof payload?.noteId === 'string' ? payload.noteId : undefined;

      const saveId =
        Number.isSafeInteger(payload?.saveId) && payload.saveId >= 0
          ? payload.saveId
          : undefined;

      const fail = (code: string) => {
        socket.emit('daily-note:operation:failed', {
          operation: 'update',
          noteId,
          saveId,
          code,
        });
      };

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

        const ack: DailyNoteSaveAck = {
          noteId: paramsResult.data.id,
          saveId,
        };

        socket.emit('daily-note:saved', ack);
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
