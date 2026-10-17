import { Router } from 'express';
import { requireUser } from '../lib/rateLimit.js';
import {
  getItems,
  addNormalItem,
  addTaskItem,
  addHabitItem,
} from '../controllers/items.controller';

const router = Router();

router.get('/items/get', requireUser, getItems);

router.post('/items/add/normal', requireUser, addNormalItem);
router.post('/items/add/task', requireUser, addTaskItem);
router.post('/items/add/habit', requireUser, addHabitItem);

export default router;
