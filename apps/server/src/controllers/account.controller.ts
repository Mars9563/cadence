import type { Request, Response } from 'express';
import { zipSync } from 'fflate';
import { deleteAccountSchema } from '@cadence/validation';

import { deleteAccount, loadExportData } from '../services/account.service.js';
import { buildExportEntries } from '../services/export/files.js';

const CLIENT_ERRORS: Record<string, { status: number; message: string }> = {
  PROFILE_NOT_FOUND: { status: 404, message: 'Profile not found.' },
};

function sendError(res: Response, error: unknown, fallback: string) {
  const code = error instanceof Error ? error.message : '';
  const known = CLIENT_ERRORS[code];

  if (known) {
    return res.status(known.status).json({ success: false, error: code, message: known.message });
  }

  console.error(fallback, error);
  return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: fallback });
}

/** GET /account/export -> cadence-export-YYYY-MM-DD.zip */
export async function exportAccount(req: Request, res: Response) {
  try {
    const now = new Date();
    const data = await loadExportData(req.userId!, req.userJWT!);
    const zip = zipSync(buildExportEntries(data, now), { level: 6 });
    const fileName = `cadence-export-${now.toISOString().slice(0, 10)}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    // The web app is on another origin; let it read the file name.
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).send(Buffer.from(zip));
  } catch (error) {
    return sendError(res, error, 'Your data couldn’t be exported. Try again.');
  }
}

/** DELETE /account  { confirm: 'DELETE' } */
export async function removeAccount(req: Request, res: Response) {
  const body = deleteAccountSchema.safeParse(req.body);

  if (!body.success) {
    return res.status(422).json({
      success: false,
      error: 'CONFIRMATION_REQUIRED',
      message: 'Type DELETE to confirm.',
    });
  }

  try {
    await deleteAccount(req.userId!, req.userJWT!);
    return res.status(200).json({ success: true });
  } catch (error) {
    return sendError(res, error, 'Your account couldn’t be deleted. Try again.');
  }
}
