import { Request, Response } from 'express';

import {
  createFolderSchema,
  folderIdParamsSchema,
  updateFolderSchema,
} from '@cadence/validation';

import {
  addFolderByUserId,
  deleteFolderById,
  getFoldersByUserId,
  updateFolderById,
} from '../services/folders.service';

/*
 * Service error codes that are the client's fault rather than the server's.
 * Anything not listed here is reported as a 500.
 */
const FOLDER_CLIENT_ERRORS: Record<string, { status: number; message: string }> =
  {
    FOLDER_NOT_FOUND: {
      status: 404,
      message: 'Folder not found.',
    },
    PARENT_FOLDER_NOT_FOUND: {
      status: 404,
      message: 'Parent folder not found.',
    },
    FOLDER_MOVE_CREATES_CYCLE: {
      status: 409,
      message: 'A folder cannot be moved into itself or its own subfolder.',
    },
    FOLDER_ID_CONFLICT: {
      status: 409,
      message: 'A folder with this id already exists.',
    },
  };

function sendFolderClientError(res: Response, error: unknown) {
  const code = error instanceof Error ? error.message : '';
  const clientError = FOLDER_CLIENT_ERRORS[code];

  if (!clientError) return null;

  return res.status(clientError.status).json({
    error: code,
    message: clientError.message,
  });
}

export async function getFolders(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const folders = await getFoldersByUserId(req.userId, req.userJWT);

    return res.status(200).json(folders);
  } catch (error) {
    console.error('Get folders controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve folders.',
    });
  }
}

export async function createFolder(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const result = createFolderSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid folder data.',
        details: result.error.flatten(),
      });
    }

    const folder = await addFolderByUserId(
      req.userId,
      req.userJWT,
      result.data,
    );

    return res.status(201).json(folder);
  } catch (error) {
    const handled = sendFolderClientError(res, error);
    if (handled) return handled;

    console.error('Create folder controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create folder.',
    });
  }
}

export async function updateFolder(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const paramsResult = folderIdParamsSchema.safeParse(req.params);

    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid folder id.',
        details: paramsResult.error.flatten(),
      });
    }

    /*
     * Rename (name), move (parentId), or both.
     */
    const bodyResult = updateFolderSchema.safeParse(req.body);

    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid folder data.',
        details: bodyResult.error.flatten(),
      });
    }

    if (
      bodyResult.data.name === undefined &&
      bodyResult.data.parentId === undefined
    ) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Provide a name or parentId to update.',
      });
    }

    const folder = await updateFolderById(
      paramsResult.data.id,
      req.userJWT,
      bodyResult.data,
    );

    return res.status(200).json(folder);
  } catch (error) {
    const handled = sendFolderClientError(res, error);
    if (handled) return handled;

    console.error('Update folder controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update folder.',
    });
  }
}

export async function deleteFolder(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const paramsResult = folderIdParamsSchema.safeParse(req.params);

    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid folder id.',
        details: paramsResult.error.flatten(),
      });
    }

    const result = await deleteFolderById(paramsResult.data.id, req.userJWT);

    return res.status(200).json(result);
  } catch (error) {
    const handled = sendFolderClientError(res, error);
    if (handled) return handled;

    console.error('Delete folder controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete folder.',
    });
  }
}
