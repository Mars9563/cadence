import { Router } from 'express';

import { requireUser } from '../lib/rateLimit.js';

import {
  createDailyNote,
  getDailyNotes,
  updateDailyNote,
} from '../controllers/daily-notes.controller';

const router = Router();

router.get('/daily-notes/get', requireUser, getDailyNotes);

router.post('/daily-notes/create', requireUser, createDailyNote);

router.patch('/daily-notes/:id', requireUser, updateDailyNote);

export default router;
