import { Request, Response } from 'express';

import {
  dailyNoteIdParamsSchema,
  updateDailyNoteSchema,
} from '@cadence/validation';

import {
  addDailyNoteByUserId,
  getDailyNotesByUserId,
  updateDailyNoteById,
} from '../services/daily-notes.services';

export async function getDailyNotes(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const dailyNotes = await getDailyNotesByUserId(req.userId, req.userJWT);

    return res.status(200).json(dailyNotes);
  } catch (error) {
    console.error('Get daily notes controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve daily notes.',
    });
  }
}

export async function createDailyNote(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    /*
     * Creation intentionally accepts NO client data.
     *
     * The service determines:
     *   - user_id from authentication
     *   - note_date from app_today()
     *   - content as ''
     */
    const dailyNote = await addDailyNoteByUserId(req.userId, req.userJWT);

    return res.status(201).json(dailyNote);
  } catch (error) {
    console.error('Create daily note controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create daily note.',
    });
  }
}

export async function updateDailyNote(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    /*
     * Validate the route parameter using the existing schema.
     */
    const paramsResult = dailyNoteIdParamsSchema.safeParse(req.params);

    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid daily note id.',
        details: paramsResult.error.flatten(),
      });
    }

    /*
     * Validate the update body using the existing schema.
     *
     * The schema intentionally only allows:
     *
     *   {
     *     content: string
     *   }
     */
    const bodyResult = updateDailyNoteSchema.safeParse(req.body);

    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid daily note data.',
        details: bodyResult.error.flatten(),
      });
    }

    const dailyNote = await updateDailyNoteById(
      paramsResult.data.id,
      bodyResult.data.content,
      req.userJWT,
    );

    return res.status(200).json(dailyNote);
  } catch (error) {
    console.error('Update daily note controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update daily note.',
    });
  }
}
