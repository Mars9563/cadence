import { Router } from 'express';

import { authenticate } from '../middleware/auth.js';
import {
  getAvatarUrl,
  getProfile,
  removeAvatar,
  setAvatar,
  signAvatarUploadRequest,
  updateProfile,
} from '../controllers/profile.controller.js';

const router = Router();

/*
 * Profile and avatar. Every route acts on the signed-in user's own profile
 * (the user id comes from the token, never from the request).
 *
 *   GET    /profile                   profile + avatarSrc
 *   PATCH  /profile                   { displayName?, dayEndTime? }
 *
 *   POST   /profile/avatar/signature  a signed upload the server built
 *   PUT    /profile/avatar            { publicId } adopt an uploaded image
 *   DELETE /profile/avatar            remove the uploaded picture
 *   GET    /profile/avatar?size=      signed URL in 64/128/256/512
 */
router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, updateProfile);

router.post('/profile/avatar/signature', authenticate, signAvatarUploadRequest);
router.put('/profile/avatar', authenticate, setAvatar);
router.delete('/profile/avatar', authenticate, removeAvatar);
router.get('/profile/avatar', authenticate, getAvatarUrl);

export default router;
