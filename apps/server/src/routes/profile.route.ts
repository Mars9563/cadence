import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getProfile } from '../controllers/profile.controller.js';

const router = Router();

router.get('/profile', authenticate, getProfile);

export default router;
