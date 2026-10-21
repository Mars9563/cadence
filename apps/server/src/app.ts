import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import profileRoutes from './routes/profile.route';
import itemsRoutes from './routes/items.route';
import habitCompletionsRoute from './routes/habit-completions.route';
import dailyNotesRoute from './routes/daily-notes.route'
import foldersRoute from './routes/folders.route';
import notesRoute from './routes/notes.route';
import accountRoute from './routes/account.route.js';
/*
 * Allowed browser origin(s) for REST and Socket.IO. Comma-separated list in
 * CORS_ORIGIN; defaults to the local Next.js dev server.
 */
export const CORS_ORIGINS = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const app = express();

/*
 * Behind a reverse proxy / ingress (k3s Traefik, nginx), set TRUST_PROXY so
 * Express sees the real client IP (rate limiting depends on it): a hop count
 * such as "1", or "true". Unset = not behind a proxy.
 */
const trustProxy = process.env.TRUST_PROXY;

if (trustProxy) {
  app.set(
    'trust proxy',
    /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true',
  );
}

app.use(helmet());

app.use(
  cors({
    origin: CORS_ORIGINS,
  }),
);

// Same headroom as the socket limit: a recovered note is created over REST
// with its full content (up to 1,000,000 characters).
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'cadence-server',
  });
});

app.use(profileRoutes);
app.use(itemsRoutes);
app.use(habitCompletionsRoute);
app.use(dailyNotesRoute);
app.use(foldersRoute);
app.use(notesRoute);
app.use(accountRoute);
export const httpServer = createServer(app);