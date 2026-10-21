import { Router } from 'express';

import { exportAccount, removeAccount } from '../controllers/account.controller.js';
import { exportLimiter, requireUser } from '../lib/rateLimit.js';

const router = Router();

/*
 * The signed-in user's whole account.
 *
 *   GET    /account/export   ZIP of all their data (5 per hour)
 *   DELETE /account          { confirm: 'DELETE' } delete the account for good
 */
router.get('/account/export', requireUser, exportLimiter, exportAccount);
router.delete('/account', requireUser, removeAccount);

export default router;
