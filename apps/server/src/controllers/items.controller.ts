import { Request, Response } from 'express';
import {
  createHabitItemSchema,
  createNormalItemSchema,
  createTaskItemSchema,
} from '@cadence/validation';

import {
  addHabitItemByUserId,
  addNormalItemByUserId,
  addTaskItemByUserId,
  getItemsByUserId,
} from '../services/items.service';

export async function getItems(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const items = await getItemsByUserId(req.userId, req.userJWT);

    return res.status(200).json(items);
  } catch (error) {
    console.error('Get items controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve items.',
    });
  }
}

export async function addNormalItem(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const result = createNormalItemSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid normal item data.',
        details: result.error.flatten(),
      });
    }

    const item = await addNormalItemByUserId(
      req.userId,
      req.userJWT,
      result.data,
    );

    return res.status(201).json(item);
  } catch (error) {
    console.error('Add normal item controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to add normal item.',
    });
  }
}

export async function addTaskItem(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const result = createTaskItemSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid task item data.',
        details: result.error.flatten(),
      });
    }

    const item = await addTaskItemByUserId(
      req.userId,
      req.userJWT,
      result.data,
    );

    return res.status(201).json(item);
  } catch (error) {
    console.error('Add task item controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to add task item.',
    });
  }
}

export async function addHabitItem(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const result = createHabitItemSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid habit item data.',
        details: result.error.flatten(),
      });
    }

    const item = await addHabitItemByUserId(
      req.userId,
      req.userJWT,
      result.data,
    );

    return res.status(201).json(item);
  } catch (error) {
    console.error('Add habit item controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to add habit item.',
    });
  }
}
