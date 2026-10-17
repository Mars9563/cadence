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
        const code = 'INVALID_COMPLETION_REQUEST';

        socket.emit('item:completion:failed', { itemId: payload?.itemId, code });
        reply(ack, { ok: false, code });
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
        switch (result.kind) {
          case 'normal':
            socket.emit('item:normal:completed', { item: result.item });
            break;

          case 'task':
            socket.emit('item:task:completed', { item: result.item });
            break;

          case 'habit':
            socket.emit('item:habit:completed', {
              completion: result.completion,
            });
            break;
        }

        reply<CompleteItemResult>(ack, { ok: true, data: result });
      } catch (error) {
        const code = errorCode(error, 'ITEM_COMPLETION_FAILED');

        console.error('Failed to mark item completed:', code);

        socket.emit('item:completion:failed', { itemId: itemId.data, code });
        reply(ack, { ok: false, code });
      }
    },
  );
}
