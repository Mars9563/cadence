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
/*
 * Allowed browser origin(s) for REST and Socket.IO. Comma-separated list in
 * CORS_ORIGIN; defaults to the local Next.js dev server.
 */
export const CORS_ORIGINS = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const app = express();

app.use(helmet());

app.use(
  cors({
    origin: CORS_ORIGINS,
  }),
);

app.use(express.json());

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
export const httpServer = createServer(app);