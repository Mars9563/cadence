import { Router } from 'express';

import { authenticate } from '../middleware/auth';

import { getHabitCompletions } from '../controllers/habit-completions.controller';

const router = Router();

router.get('/habit-completions/get', authenticate, getHabitCompletions);

export default router;
