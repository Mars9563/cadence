// Importing realtime also attaches Socket.IO to the HTTP server.
import { io } from './realtime/index.js';
import { httpServer } from './app.js';

const PORT = Number(process.env.PORT) || 4000;

httpServer.listen(PORT, () => {
  console.log(`Cadence server running on http://localhost:${PORT}`);
});

/*
 * Graceful shutdown. Kubernetes (and docker stop) send SIGTERM before
 * killing the process: stop accepting connections, let sockets close, and
 * exit. Forced after 10s so a stuck connection cannot block a rollout.
 */
let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received, shutting down…`);

  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();

  io.close(() => {
    httpServer.close(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
