import { Server } from 'socket.io';
import { CORS_ORIGINS, httpServer } from '../app';
import { socketAuth } from './middleware/auth';
import { registerSocketHandlers } from './handlers/connection.handler';

export const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
  },
});

io.use(socketAuth);

io.on('connection', (socket) => {
  registerSocketHandlers(socket);
});
