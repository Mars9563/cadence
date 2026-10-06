import { Server } from 'socket.io';
import { httpServer } from '../app';
import { socketAuth } from './middleware/auth';
import { registerSocketHandlers } from './handlers/connection.handler';

export const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
});

io.use(socketAuth);

io.on('connection', (socket) => {
  registerSocketHandlers(socket);
});
