import { Router } from 'express';

import { authenticate } from '../middleware/auth';

import {
  createNote,
  deleteNote,
  getNote,
  getNotes,
  updateNote,
} from '../controllers/notes.controller';

const router = Router();

// Registered before '/notes/:id' so 'get' is never read as a note id.
router.get('/notes/get', authenticate, getNotes);

router.get('/notes/:id', authenticate, getNote);

router.post('/notes/create', authenticate, createNote);

router.patch('/notes/:id', authenticate, updateNote);

router.delete('/notes/:id', authenticate, deleteNote);

export default router;
