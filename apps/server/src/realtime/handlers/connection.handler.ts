import { Socket } from 'socket.io';
import { registerItemsHandlers } from './items.handlers';
import { registerDailyNotesHandlers } from './daily-notes.handlers';

export function registerSocketHandlers(socket: Socket) {
  registerItemsHandlers(socket);
  registerDailyNotesHandlers(socket);

  socket.on('disconnect', (reason) => {
    console.log(
      'socket Id:' + socket.id + ' got disconnected due to: ' + reason,
    );
  });
}
