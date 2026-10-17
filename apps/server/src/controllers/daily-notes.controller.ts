import { Request, Response } from 'express';

import {
  createTodayDailyNoteSchema,
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
     * The only client data accepted is an optional row id (the id the
     * client already uses locally). The service determines:
     *   - user_id from authentication
     *   - note_date from app_today()
     *   - content as ''
     * and returns the existing note if today's already exists.
     */
    const body = createTodayDailyNoteSchema.safeParse(req.body ?? {});

    if (!body.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid daily note data.',
        details: body.error.flatten(),
      });
    }

    const dailyNote = await addDailyNoteByUserId(
      req.userId,
      req.userJWT,
      body.data.id,
    );

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

    /*
     * Acknowledge only: `{ success: true, data: { noteId } }`.
     * The saved document is never echoed back.
     */
    const result = await updateDailyNoteById(
      paramsResult.data.id,
      bodyResult.data.content,
      req.userJWT,
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'DAILY_NOTE_NOT_FOUND') {
      return res.status(404).json({
        error: 'DAILY_NOTE_NOT_FOUND',
        message: 'Daily note not found.',
      });
    }

    console.error('Update daily note controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update daily note.',
    });
  }
}
