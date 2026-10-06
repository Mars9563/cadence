import { Request, Response } from 'express';

import { getHabitCompletionsByUserId } from '../services/habit-completions.service';

export async function getHabitCompletions(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const completions = await getHabitCompletionsByUserId(
      req.userId,
      req.userJWT,
    );

    return res.status(200).json(completions);
  } catch (error) {
    console.error('Get habit completions controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve habit completions.',
    });
  }
}
