import type { AvatarUploadSignature } from '@cadence/types';
import {
  AVATAR_FOLDER,
  avatarFolderFor,
  isAvatarPublicIdOf,
  type AvatarSize,
} from '@cadence/validation';

import { getCloudinary } from '../lib/cloudinary';

/*
 * Avatars on Cloudinary, the abuse-resistant way:
 *
 *   - Uploads are SIGNED. The server signs only a small, known set of upload
 *     parameters, forces the user's own folder and authenticated delivery,
 *     and refuses anything that could cost money or leak (transformations,
 *     eager processing, webhooks, other folders, other presets).
 *   - Images use delivery type `authenticated`: an unsigned URL does not
 *     work, so a public_id alone is useless to anyone else.
 *   - Display URLs are signed by the server in a few fixed sizes only, so no
 *     one can request arbitrary (billable) transformations.
 */

/** How old a timestamp in a signing request may be (Cloudinary allows 1h). */
const MAX_TIMESTAMP_SKEW_SECONDS = 10 * 60;

/** A file name inside the user's folder (no slashes, no extension). */
const NAME_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

const BOOLEAN_PARAMS = new Set([
  'overwrite',
  'unique_filename',
  'use_filename',
  'use_asset_folder_as_public_id_prefix',
  'invalidate',
]);

/** Every parameter the server is willing to sign. Anything else: refused. */
const ALLOWED_PARAMS = new Set([
  'timestamp',
  'upload_preset',
  'folder',
  'asset_folder',
  'public_id',
  'source',
  'type',
  'custom_coordinates',
  ...BOOLEAN_PARAMS,
]);

type SignableParams = Record<string, string | number | boolean>;

const isTrueOrFalse = (value: unknown) =>
  value === true || value === false || value === 'true' || value === 'false';

/**
 * Check and sign upload parameters for `userId`'s avatar. Throws a code the
 * controller maps to a 4xx when anything is outside the rules. Used by
 * createAvatarUpload (and kept strict so it is safe to expose later, e.g.
 * for Cloudinary's upload widget, which proposes its own parameters).
 */
export function signParams(
  userId: string,
  params: SignableParams,
): { signature: string } {
  const { sdk, env } = getCloudinary();
  const folder = avatarFolderFor(userId);

  for (const key of Object.keys(params)) {
    if (!ALLOWED_PARAMS.has(key)) {
      throw new Error(`DISALLOWED_UPLOAD_PARAM:${key}`);
    }
  }

  // Fresh timestamp only: an old signature cannot be replayed later.
  const timestamp = Number(params.timestamp);
  const now = Math.floor(Date.now() / 1000);

  if (
    !Number.isInteger(timestamp) ||
    Math.abs(now - timestamp) > MAX_TIMESTAMP_SKEW_SECONDS
  ) {
    throw new Error('UPLOAD_TIMESTAMP_INVALID');
  }

  // The image must end up in the user's own folder, however it is named.
  if (params.folder !== undefined && params.folder !== folder) {
    throw new Error('UPLOAD_FOLDER_NOT_ALLOWED');
  }

  if (params.asset_folder !== undefined && params.asset_folder !== folder) {
    throw new Error('UPLOAD_FOLDER_NOT_ALLOWED');
  }

  if (params.public_id !== undefined) {
    const publicId = String(params.public_id);
    const name = publicId.startsWith(`${folder}/`)
      ? publicId.slice(folder.length + 1)
      : publicId;

    const isFullId = name !== publicId;
    const hasFolderParam =
      params.folder !== undefined || params.asset_folder !== undefined;

    /*
     * Either a full id in the user's folder (and no folder param, which
     * Cloudinary would prepend again), or a bare name plus the folder param.
     */
    if (
      !NAME_PATTERN.test(name) ||
      (isFullId && params.folder !== undefined) ||
      (!isFullId && !hasFolderParam)
    ) {
      throw new Error('UPLOAD_PUBLIC_ID_NOT_ALLOWED');
    }
  } else if (params.folder === undefined && params.asset_folder === undefined) {
    throw new Error('UPLOAD_FOLDER_REQUIRED');
  }

  // Delivery must stay private: authenticated, never public `upload`.
  if (params.type !== undefined && params.type !== 'authenticated') {
    throw new Error('UPLOAD_TYPE_NOT_ALLOWED');
  }

  if (env.avatarPreset) {
    if (params.upload_preset !== env.avatarPreset) {
      throw new Error('UPLOAD_PRESET_NOT_ALLOWED');
    }
  } else {
    // Without a preset, the request itself must ask for private delivery.
    if (params.upload_preset !== undefined) {
      throw new Error('UPLOAD_PRESET_NOT_ALLOWED');
    }

    if (params.type !== 'authenticated') {
      throw new Error('UPLOAD_TYPE_NOT_ALLOWED');
    }
  }

  if (params.source !== undefined && params.source !== 'uw') {
    throw new Error('DISALLOWED_UPLOAD_PARAM:source');
  }

  if (
    params.custom_coordinates !== undefined &&
    !/^\d{1,5},\d{1,5},\d{1,5},\d{1,5}$/.test(String(params.custom_coordinates))
  ) {
    throw new Error('DISALLOWED_UPLOAD_PARAM:custom_coordinates');
  }

  for (const key of BOOLEAN_PARAMS) {
    if (params[key] !== undefined && !isTrueOrFalse(params[key])) {
      throw new Error(`DISALLOWED_UPLOAD_PARAM:${key}`);
    }
  }

  return { signature: sdk.utils.api_sign_request(params, env.apiSecret) };
}

/**
 * A ready-to-use signed upload for a new avatar. The server picks every
 * parameter (a fresh timestamp, a new public_id in the user's folder, the
 * avatar preset or private delivery) and still runs them through
 * signAvatarUpload's checks, so nothing outside the rules is ever signed.
 */
export function createAvatarUpload(userId: string): AvatarUploadSignature {
  const { env } = getCloudinary();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${avatarFolderFor(userId)}/avatar_${timestamp}`;

  // Full public_id, no folder param: correct on fixed- and dynamic-folder
  // accounts alike.
  const params: Record<string, string | number> = env.avatarPreset
    ? { timestamp, public_id: publicId, upload_preset: env.avatarPreset }
    : { timestamp, public_id: publicId, type: 'authenticated' };

  const { signature } = signParams(userId, params);

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudName}/image/upload`,
    apiKey: env.apiKey,
    signature,
    params,
    publicId,
  };
}

/**
 * Confirm an uploaded avatar exists, belongs to `userId`, and was stored
 * with authenticated delivery, before it is saved on the profile.
 */
export async function assertUploadedAvatar(userId: string, publicId: string) {
  if (!isAvatarPublicIdOf(userId, publicId)) {
    throw new Error('AVATAR_NOT_OWNED');
  }

  const { sdk } = getCloudinary();

  try {
    await sdk.api.resource(publicId, {
      type: 'authenticated',
      resource_type: 'image',
    });
  } catch (error) {
    const status = (error as { error?: { http_code?: number } })?.error?.http_code;

    if (status === 404) {
      // Either never uploaded, or uploaded with public (`upload`) delivery.
      throw new Error('AVATAR_NOT_FOUND');
    }

    console.error('Cloudinary resource lookup failed:', error);
    throw new Error('CLOUDINARY_UNAVAILABLE');
  }
}

/**
 * Delete a replaced or removed avatar. Best effort: a failure is logged and
 * never blocks the profile change (an orphan image costs storage, nothing
 * else).
 */
export async function destroyAvatar(publicId: string | null) {
  if (!publicId || !publicId.startsWith(`${AVATAR_FOLDER}/`)) return;

  try {
    const { sdk } = getCloudinary();

    await sdk.uploader.destroy(publicId, {
      type: 'authenticated',
      resource_type: 'image',
      invalidate: true,
    });
  } catch (error) {
    console.error('Failed to delete old avatar from Cloudinary:', publicId, error);
  }
}

/**
 * Delete every uploaded avatar of a user, then their folder. Used when the
 * account is deleted; throws so the caller can log a failed cleanup.
 */
export async function destroyAvatarFolder(userId: string): Promise<void> {
  const { sdk } = getCloudinary();
  const folder = avatarFolderFor(userId);

  await sdk.api.delete_resources_by_prefix(`${folder}/`, {
    type: 'authenticated',
    resource_type: 'image',
    invalidate: true,
  });

  try {
    await sdk.api.delete_folder(folder);
  } catch (error) {
    // A user who never uploaded a photo has no folder.
    const status = (error as { error?: { http_code?: number } })?.error?.http_code;
    if (status !== 404) throw error;
  }
}

/**
 * A signed, square, face-cropped URL for an avatar in one of the allowed
 * sizes. The signature covers the transformation, so the URL cannot be
 * edited into a different (billable) one.
 */
export function signedAvatarUrl(publicId: string, size: AvatarSize = 256): string {
  const { sdk } = getCloudinary();

  return sdk.url(publicId, {
    type: 'authenticated',
    resource_type: 'image',
    sign_url: true,
    secure: true,
    transformation: [
      { width: size, height: size, crop: 'fill', gravity: 'face' },
      { fetch_format: 'auto', quality: 'auto' },
    ],
  });
}

/**
 * The picture to show for a profile: the uploaded avatar (signed), else the
 * external OAuth avatar, else nothing. If Cloudinary is not configured the
 * uploaded avatar is skipped rather than failing the whole profile.
 */
export function resolveAvatarSrc(
  avatarPublicId: string | null,
  avatarUrl: string | null,
  size: AvatarSize = 256,
): string | null {
  if (avatarPublicId) {
    try {
      return signedAvatarUrl(avatarPublicId, size);
    } catch {
      // CLOUDINARY_NOT_CONFIGURED: fall back below.
    }
  }

  return avatarUrl;
}
