import { Socket } from 'socket.io';

import type { NoteSaveAck } from '@cadence/types';

import { noteIdParamsSchema, updateNoteSchema } from '@cadence/validation';

import { updateNoteContentById } from '../../services/notes.service';
import { reply } from '../ack';

type UpdateNotePayload = {
  noteId: string;
  content: string;
  saveId: number;
};

/*
 * Content is required here, unlike the REST schema where every field is
 * optional.
 */
const noteContentSchema = updateNoteSchema
  .pick({ content: true })
  .required();

export function registerNotesHandlers(socket: Socket) {
  /*
   * Save a Note's content (editor autosave).
   *
   * Create, rename, move and delete are REST operations; this socket event
   * only persists content.
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
  socket.on('note:update', async (payload: UpdateNotePayload, ack?: unknown) => {
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

      const paramsResult = noteIdParamsSchema.safeParse({
        id: payload?.noteId,
      });

      if (!paramsResult.success) {
        fail('INVALID_NOTE_ID');

        return;
      }

      const bodyResult = noteContentSchema.safeParse({
        content: payload?.content,
      });

      if (!bodyResult.success) {
        fail('INVALID_NOTE_CONTENT');

        return;
      }

      await updateNoteContentById(
        paramsResult.data.id,
        bodyResult.data.content,
        socket.data.token,
      );

      const saved: NoteSaveAck = {
        noteId: paramsResult.data.id,
        saveId,
      };

      reply(ack, { ok: true, data: saved });
    } catch (error) {
      console.error('Failed to update note:', error);

      fail(error instanceof Error ? error.message : 'NOTE_UPDATE_FAILED');
    }
  });
}
