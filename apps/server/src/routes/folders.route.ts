import { Router } from 'express';

import { requireUser } from '../lib/rateLimit.js';

import {
  createFolder,
  deleteFolder,
  getFolders,
  updateFolder,
} from '../controllers/folders.controller';

const router = Router();

router.get('/folders/get', requireUser, getFolders);

router.post('/folders/create', requireUser, createFolder);

router.patch('/folders/:id', requireUser, updateFolder);

router.delete('/folders/:id', requireUser, deleteFolder);

export default router;
