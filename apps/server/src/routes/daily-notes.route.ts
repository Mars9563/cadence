import { Router } from 'express';

import { authenticate } from '../middleware/auth';

import {
  createDailyNote,
  getDailyNotes,
  updateDailyNote,
} from '../controllers/daily-notes.controller';

const router = Router();

router.get('/daily-notes/get', authenticate, getDailyNotes);

router.post('/daily-notes/create', authenticate, createDailyNote);

router.patch('/daily-notes/:id', authenticate, updateDailyNote);

export default router;
