import type { Request, Response } from 'express';
import type { Profile, ProfileView } from '@cadence/types';
import {
  avatarSizeSchema,
  daySettingsSchema,
  onboardingSchema,
  setAvatarSchema,
  updateProfileDetailsSchema,
} from '@cadence/validation';

import {
  assertUploadedAvatar,
  createAvatarUpload,
  destroyAvatar,
  resolveAvatarSrc,
  signedAvatarUrl,
} from '../services/avatar.service.js';
import {
  cancelPendingDaySettings,
  clearProfileAvatar,
  completeOnboarding,
  getProfileByUserId,
  scheduleDaySettings,
  setProfileAvatar,
  updateProfileDetails,
} from '../services/profile.service.js';

/*
 * Response shapes:
 *   GET /profile         the ProfileView itself (unchanged contract)
 *   everything else      { success: true, data }  /  { success: false, error, message }
 */

const CLIENT_ERRORS: Record<string, { status: number; message: string }> = {
  PROFILE_NOT_FOUND: { status: 404, message: 'Profile not found.' },
  DAY_END_TIME_OUT_OF_RANGE: {
    status: 422,
    message: 'The day boundary must be between 00:00 and 08:00.',
  },
  INVALID_TIME_ZONE: {
    status: 422,
    message: "That time zone isn't recognised. Pick another from the list.",
  },
  ALREADY_ONBOARDED: {
    status: 409,
    message: 'Setup is already done. Change these in Settings.',
  },
  DISPLAY_NAME_INVALID: {
    status: 422,
    message: 'Display name must be 1 to 100 characters.',
  },
  AVATAR_NOT_OWNED: {
    status: 403,
    message: 'That image is not in your avatar folder.',
  },
  AVATAR_NOT_FOUND: {
    status: 404,
    message:
      'No private image with that id. Upload it with the avatar settings first.',
  },
  NO_AVATAR: { status: 404, message: 'This profile has no uploaded avatar.' },
  UPLOAD_TIMESTAMP_INVALID: {
    status: 400,
    message: 'The upload request is missing a current timestamp.',
  },
  UPLOAD_FOLDER_REQUIRED: {
    status: 400,
    message: 'The upload must go to your avatar folder.',
  },
  UPLOAD_FOLDER_NOT_ALLOWED: {
    status: 403,
    message: 'Uploads are only allowed into your own avatar folder.',
  },
  UPLOAD_PUBLIC_ID_NOT_ALLOWED: {
    status: 403,
    message: 'That image name is not allowed.',
  },
  UPLOAD_TYPE_NOT_ALLOWED: {
    status: 403,
    message: 'Avatars must be uploaded with private (authenticated) delivery.',
  },
  UPLOAD_PRESET_NOT_ALLOWED: {
    status: 403,
    message: 'Uploads must use the avatar upload preset.',
  },
  CLOUDINARY_NOT_CONFIGURED: {
    status: 503,
    message: 'Image uploads are not set up on this server.',
  },
  CLOUDINARY_UNAVAILABLE: {
    status: 502,
    message: 'The image service did not respond. Try again.',
  },
};

function sendError(res: Response, error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : '';

  // DISALLOWED_UPLOAD_PARAM:<name> carries the offending parameter.
  if (raw.startsWith('DISALLOWED_UPLOAD_PARAM:')) {
    const param = raw.slice('DISALLOWED_UPLOAD_PARAM:'.length);

    return res.status(400).json({
      success: false,
      error: 'DISALLOWED_UPLOAD_PARAM',
      message: `The upload parameter "${param}" is not allowed.`,
    });
  }

  const known = CLIENT_ERRORS[raw];

  if (known) {
    return res.status(known.status).json({
      success: false,
      error: raw,
      message: known.message,
    });
  }

  console.error(`${fallback}:`, error);

  return res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: fallback,
  });
}

function sendValidationError(
  res: Response,
  message: string,
  details: unknown,
) {
  return res.status(400).json({
    success: false,
    error: 'VALIDATION_ERROR',
    message,
    details,
  });
}

function toView(profile: Profile): ProfileView {
  return {
    ...profile,
    avatarSrc: resolveAvatarSrc(profile.avatarPublicId, profile.avatarUrl),
  };
}

/** The authenticate middleware guarantees both; this narrows the types. */
function auth(req: Request) {
  return { userId: req.userId!, token: req.userJWT! };
}

/** GET /profile */
export async function getProfile(req: Request, res: Response) {
  try {
    const { userId, token } = auth(req);
    const profile = await getProfileByUserId(userId, token);

    if (!profile) throw new Error('PROFILE_NOT_FOUND');

    return res.status(200).json(toView(profile));
  } catch (error) {
    return sendError(res, error, 'Failed to retrieve profile.');
  }
}

/** PATCH /profile  { displayName?, theme? } */
export async function updateProfile(req: Request, res: Response) {
  const body = updateProfileDetailsSchema.safeParse(req.body);

  if (!body.success) {
    return sendValidationError(res, 'Invalid profile data.', body.error.flatten());
  }

  try {
    const { userId, token } = auth(req);
    const profile = await updateProfileDetails(userId, token, body.data);

    return res.status(200).json({ success: true, data: toView(profile) });
  } catch (error) {
    return sendError(res, error, 'Failed to update profile.');
  }
}

/** PUT /profile/day-settings  { timeZone, dayEndTime } -> schedules the change */
export async function putDaySettings(req: Request, res: Response) {
  const body = daySettingsSchema.safeParse(req.body);

  if (!body.success) {
    return sendValidationError(res, 'Invalid day settings.', body.error.flatten());
  }

  try {
    const { token } = auth(req);
    const profile = await scheduleDaySettings(token, body.data);

    return res.status(200).json({ success: true, data: toView(profile) });
  } catch (error) {
    return sendError(res, error, 'Failed to save day settings.');
  }
}

/** DELETE /profile/day-settings/pending */
export async function deletePendingDaySettings(req: Request, res: Response) {
  try {
    const { token } = auth(req);
    const profile = await cancelPendingDaySettings(token);

    return res.status(200).json({ success: true, data: toView(profile) });
  } catch (error) {
    return sendError(res, error, 'Failed to cancel the change.');
  }
}

/** POST /profile/onboarding  { timeZone, dayEndTime, displayName } */
export async function postOnboarding(req: Request, res: Response) {
  const body = onboardingSchema.safeParse(req.body);

  if (!body.success) {
    return sendValidationError(res, 'Invalid setup details.', body.error.flatten());
  }

  try {
    const { token } = auth(req);
    const profile = await completeOnboarding(token, body.data);

    return res.status(200).json({ success: true, data: toView(profile) });
  } catch (error) {
    return sendError(res, error, 'Failed to finish setup.');
  }
}

/** POST /profile/avatar/signature  -> a signed upload the server built */
export async function signAvatarUploadRequest(req: Request, res: Response) {
  try {
    const { userId } = auth(req);

    return res
      .status(200)
      .json({ success: true, data: createAvatarUpload(userId) });
  } catch (error) {
    return sendError(res, error, 'Failed to sign the upload.');
  }
}

/** PUT /profile/avatar  { publicId } */
export async function setAvatar(req: Request, res: Response) {
  const body = setAvatarSchema.safeParse(req.body);

  if (!body.success) {
    return sendValidationError(res, 'Invalid avatar id.', body.error.flatten());
  }

  try {
    const { userId, token } = auth(req);

    // Ownership + existence (+ private delivery) before it touches the row.
    await assertUploadedAvatar(userId, body.data.publicId);

    const { profile, previousPublicId } = await setProfileAvatar(
      userId,
      token,
      body.data.publicId,
    );

    // The replaced image is no longer reachable from any profile.
    await destroyAvatar(previousPublicId);

    return res.status(200).json({ success: true, data: toView(profile) });
  } catch (error) {
    return sendError(res, error, 'Failed to set the avatar.');
  }
}

/** DELETE /profile/avatar */
export async function removeAvatar(req: Request, res: Response) {
  try {
    const { userId, token } = auth(req);
    const { profile, previousPublicId } = await clearProfileAvatar(userId, token);

    await destroyAvatar(previousPublicId);

    return res.status(200).json({ success: true, data: toView(profile) });
  } catch (error) {
    return sendError(res, error, 'Failed to remove the avatar.');
  }
}

/** GET /profile/avatar?size=64|128|256|512  -> { url } (signed) */
export async function getAvatarUrl(req: Request, res: Response) {
  const size = avatarSizeSchema.safeParse(req.query.size ?? 256);

  if (!size.success) {
    return sendValidationError(res, 'Invalid avatar size.', size.error.flatten());
  }

  try {
    const { userId, token } = auth(req);
    const profile = await getProfileByUserId(userId, token);

    if (!profile) throw new Error('PROFILE_NOT_FOUND');
    if (!profile.avatarPublicId) throw new Error('NO_AVATAR');

    return res.status(200).json({
      success: true,
      data: { url: signedAvatarUrl(profile.avatarPublicId, size.data) },
    });
  } catch (error) {
    return sendError(res, error, 'Failed to sign the avatar URL.');
  }
}
