import { Socket } from 'socket.io';
import { completeItemByUserId } from '../../services/items.service';

type CompleteItemPayload = {
  itemId: string;
};

export function registerItemsHandlers(socket: Socket) {
  socket.on('item:complete', async ({ itemId }: CompleteItemPayload) => {
    try {
      const result = await completeItemByUserId(
        socket.data.userId,
        socket.data.token,
        itemId,
      );

      // result.kind is derived from the DB row, never from the client.
      switch (result.kind) {
        case 'normal':
          socket.emit('item:normal:completed', {
            item: result.item,
          });
          break;

        case 'task':
          socket.emit('item:task:completed', {
            item: result.item,
          });
          break;

        case 'habit':
          // This is the actual persisted habit_completions row mapped to
          // the frontend HabitCompletion type. Zustand can insert it directly.
          socket.emit('item:habit:completed', {
            completion: result.completion,
          });
          break;
      }
    } catch (error) {
      console.error('Failed to mark item completed:', error);

      socket.emit('item:completion:failed', {
        itemId,
        code: error instanceof Error ? error.message : 'ITEM_COMPLETION_FAILED',
      });
    }
  });
}
