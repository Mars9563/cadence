import { Socket } from 'socket.io';

import { limitSocketEvents } from '../rateLimit';
import { registerAuthHandlers } from './auth.handlers';
import { registerItemsHandlers } from './items.handlers';
import { registerDailyNotesHandlers } from './daily-notes.handlers';
import { registerNotesHandlers } from './notes.handlers';

export function registerSocketHandlers(socket: Socket) {
  limitSocketEvents(socket);
  registerAuthHandlers(socket);
  registerItemsHandlers(socket);
  registerDailyNotesHandlers(socket);
  registerNotesHandlers(socket);
}
