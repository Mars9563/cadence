import { Request, Response } from 'express';
import { getProfileByUserId } from '../services/profile.service.js';

export async function getProfile(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const profile = await getProfileByUserId(req.userId, req.userJWT);

    if (!profile) {
      return res.status(404).json({
        error: 'PROFILE_NOT_FOUND',
        message: 'Profile not found.',
      });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error('Get profile controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve profile.',
    });
  }
}
