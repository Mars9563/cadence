import { Router } from 'express';

import { authenticate } from '../middleware/auth';

import {
  createFolder,
  deleteFolder,
  getFolders,
  updateFolder,
} from '../controllers/folders.controller';

const router = Router();

router.get('/folders/get', authenticate, getFolders);

router.post('/folders/create', authenticate, createFolder);

router.patch('/folders/:id', authenticate, updateFolder);

router.delete('/folders/:id', authenticate, deleteFolder);

export default router;
