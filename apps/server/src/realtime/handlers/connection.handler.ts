import { Socket } from 'socket.io';
import { registerItemsHandlers } from './items.handlers';

export function registerSocketHandlers(socket: Socket) {
  registerItemsHandlers(socket);

  socket.on('disconnect', (reason) => {
    console.log(
      'socket Id:' + socket.id + ' got disconnected due to: ' + reason,
    );
  });
}
