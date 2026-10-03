import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getItems,
  addNormalItem,
  addTaskItem,
  addHabitItem,
} from '../controllers/items.controller';

const router = Router();

router.get('/items/get', authenticate, getItems);

router.post('/items/add/normal', authenticate, addNormalItem);
router.post('/items/add/task', authenticate, addTaskItem);
router.post('/items/add/habit', authenticate, addHabitItem);

export default router;
