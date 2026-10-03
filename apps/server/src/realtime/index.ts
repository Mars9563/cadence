import { Server } from 'socket.io'
import { httpServer } from '../app';

const io = new Server(httpServer);

io.on("connection", (socket) => {
    console.log(socket.id);
})