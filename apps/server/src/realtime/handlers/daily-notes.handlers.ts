import { Socket } from 'socket.io';

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
   *   content
   * }
   */
  socket.on(
    'daily-note:update',
    async (payload: UpdateDailyNotePayload) => {
      try {
        const paramsResult =
          dailyNoteIdParamsSchema.safeParse({
            id: payload?.noteId,
          });

        if (!paramsResult.success) {
          socket.emit('daily-note:operation:failed', {
            operation: 'update',
            code: 'INVALID_DAILY_NOTE_ID',
          });

          return;
        }

        const bodyResult =
          updateDailyNoteSchema.safeParse({
            content: payload?.content,
          });

        if (!bodyResult.success) {
          socket.emit('daily-note:operation:failed', {
            operation: 'update',
            code: 'INVALID_DAILY_NOTE_CONTENT',
          });

          return;
        }

        const result = await updateDailyNoteById(
          paramsResult.data.id,
          bodyResult.data.content,
          socket.data.token,
        );

        socket.emit('daily-note:updated', {
          dailyNote: result.data?.dailyNote,
        });
      } catch (error) {
        console.error(
          'Failed to update daily note:',
          error,
        );

        socket.emit('daily-note:operation:failed', {
          operation: 'update',
          noteId: payload?.noteId,
          code:
            error instanceof Error
              ? error.message
              : 'DAILY_NOTE_UPDATE_FAILED',
        });
      }
    },
  );
}