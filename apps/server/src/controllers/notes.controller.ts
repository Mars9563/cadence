import { Request, Response } from 'express';

import {
  createNoteSchema,
  noteIdParamsSchema,
  updateNoteSchema,
} from '@cadence/validation';

import {
  addNoteByUserId,
  deleteNoteById,
  getNoteById,
  getNotesByUserId,
  updateNoteById,
} from '../services/notes.service';

/*
 * REST only renames and moves notes. Content saves go through the socket
 * (`note:update`), so `content` is not accepted here.
 */
const updateNoteDetailsSchema = updateNoteSchema.omit({ content: true });

/*
 * Service error codes that are the client's fault rather than the server's.
 * Anything not listed here is reported as a 500.
 */
const NOTE_CLIENT_ERRORS: Record<string, { status: number; message: string }> =
  {
    NOTE_NOT_FOUND: {
      status: 404,
      message: 'Note not found.',
    },
    FOLDER_NOT_FOUND: {
      status: 404,
      message: 'Folder not found.',
    },
    NOTE_ID_CONFLICT: {
      status: 409,
      message: 'A note with this id already exists.',
    },
  };

function sendNoteClientError(res: Response, error: unknown) {
  const code = error instanceof Error ? error.message : '';
  const clientError = NOTE_CLIENT_ERRORS[code];

  if (!clientError) return null;

  return res.status(clientError.status).json({
    error: code,
    message: clientError.message,
  });
}

export async function getNotes(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    /*
     * Summaries only (no content). Open a note with GET /notes/:id.
     */
    const notes = await getNotesByUserId(req.userId, req.userJWT);

    return res.status(200).json(notes);
  } catch (error) {
    console.error('Get notes controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve notes.',
    });
  }
}

export async function getNote(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const paramsResult = noteIdParamsSchema.safeParse(req.params);

    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid note id.',
        details: paramsResult.error.flatten(),
      });
    }

    const note = await getNoteById(paramsResult.data.id, req.userJWT);

    return res.status(200).json(note);
  } catch (error) {
    const handled = sendNoteClientError(res, error);
    if (handled) return handled;

    console.error('Get note controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve note.',
    });
  }
}

export async function createNote(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const result = createNoteSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid note data.',
        details: result.error.flatten(),
      });
    }

    const note = await addNoteByUserId(req.userId, req.userJWT, result.data);

    return res.status(201).json(note);
  } catch (error) {
    const handled = sendNoteClientError(res, error);
    if (handled) return handled;

    console.error('Create note controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create note.',
    });
  }
}

export async function updateNote(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const paramsResult = noteIdParamsSchema.safeParse(req.params);

    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid note id.',
        details: paramsResult.error.flatten(),
      });
    }

    /*
     * Rename (title), move (folderId), or both.
     */
    const bodyResult = updateNoteDetailsSchema.safeParse(req.body);

    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid note data.',
        details: bodyResult.error.flatten(),
      });
    }

    if (
      bodyResult.data.title === undefined &&
      bodyResult.data.folderId === undefined
    ) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Provide a title or folderId to update.',
      });
    }

    const note = await updateNoteById(
      paramsResult.data.id,
      req.userJWT,
      bodyResult.data,
    );

    return res.status(200).json(note);
  } catch (error) {
    const handled = sendNoteClientError(res, error);
    if (handled) return handled;

    console.error('Update note controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update note.',
    });
  }
}

export async function deleteNote(req: Request, res: Response) {
  try {
    if (!req.userId || !req.userJWT) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authenticated user is required.',
      });
    }

    const paramsResult = noteIdParamsSchema.safeParse(req.params);

    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid note id.',
        details: paramsResult.error.flatten(),
      });
    }

    const result = await deleteNoteById(paramsResult.data.id, req.userJWT);

    return res.status(200).json(result);
  } catch (error) {
    const handled = sendNoteClientError(res, error);
    if (handled) return handled;

    console.error('Delete note controller error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete note.',
    });
  }
}
