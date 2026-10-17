import { Server } from 'socket.io';
import { CORS_ORIGINS, httpServer } from '../app';
import { socketAuth } from './middleware/auth';
import { socketConnectionLimit } from './rateLimit';
import { registerSocketHandlers } from './handlers/connection.handler';

/*
 * Notes may hold up to 1,000,000 characters (updateNoteSchema). The default
 * 1 MB message limit is smaller than that once UTF-8 and JSON escaping are
 * counted, and an oversized message makes the server drop the connection,
 * so a large note could never save. 5 MB covers the limit with headroom.
 */
const MAX_MESSAGE_BYTES = 5 * 1024 * 1024;

export const io = new Server(httpServer, {
  maxHttpBufferSize: MAX_MESSAGE_BYTES,
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
  },
});

io.use(socketConnectionLimit);
io.use(socketAuth);

io.on('connection', (socket) => {
  registerSocketHandlers(socket);
});
