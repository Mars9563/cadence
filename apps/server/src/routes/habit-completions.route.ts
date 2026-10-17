import { Router } from 'express';

import { requireUser } from '../lib/rateLimit.js';

import { getHabitCompletions } from '../controllers/habit-completions.controller';

const router = Router();

router.get('/habit-completions/get', requireUser, getHabitCompletions);

export default router;
