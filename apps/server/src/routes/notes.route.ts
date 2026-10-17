import { Router } from 'express';

import { requireUser } from '../lib/rateLimit.js';

import {
  createNote,
  deleteNote,
  getNote,
  getNotes,
  updateNote,
} from '../controllers/notes.controller';

const router = Router();

// Registered before '/notes/:id' so 'get' is never read as a note id.
router.get('/notes/get', requireUser, getNotes);

router.get('/notes/:id', requireUser, getNote);

router.post('/notes/create', requireUser, createNote);

router.patch('/notes/:id', requireUser, updateNote);

router.delete('/notes/:id', requireUser, deleteNote);

export default router;
