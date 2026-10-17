import { Socket } from 'socket.io';

import { dateSchema, uuidSchema } from '@cadence/validation';

import {
  completeItemByUserId,
  type CompleteItemResult,
} from '../../services/items.service';
import { errorCode, reply } from '../ack';

type CompleteItemPayload = {
  itemId: string;

  /**
   * The Cadence date the user saw when they completed the item. Sent by the
   * offline queue so a late delivery cannot land on the wrong day.
   */
  expectedDate?: string;
};

export function registerItemsHandlers(socket: Socket) {
  socket.on(
    'item:complete',
    async (payload: CompleteItemPayload, ack?: unknown) => {
      const itemId = uuidSchema.safeParse(payload?.itemId);
      const expectedDate =
        payload?.expectedDate === undefined
          ? undefined
          : dateSchema.safeParse(payload.expectedDate);

      if (!itemId.success || (expectedDate && !expectedDate.success)) {
        reply(ack, { ok: false, code: 'INVALID_COMPLETION_REQUEST' });
        return;
      }

      try {
        const result = await completeItemByUserId(
          socket.data.userId,
          socket.data.token,
          itemId.data,
          expectedDate?.data,
        );

        // result.kind is derived from the DB row, never from the client.
        reply<CompleteItemResult>(ack, { ok: true, data: result });
      } catch (error) {
        const code = errorCode(error, 'ITEM_COMPLETION_FAILED');

        console.error('Failed to mark item completed:', code);

        reply(ack, { ok: false, code });
      }
    },
  );
}
