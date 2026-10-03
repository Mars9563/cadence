import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from 'dotenv';
import profileRoutes from './routes/profile.route';
import itemsRoutes from './routes/items.route';
import { createServer } from 'http';

export const app = express();

app.use(helmet());

app.use(
  cors({
    origin: 'http://localhost:3000',
  }),
);

app.use(express.json());

export const httpServer = createServer(app);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'cadence-server',
  });
});

app.use(profileRoutes);
app.use(itemsRoutes);
