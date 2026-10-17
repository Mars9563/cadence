'use client';

import type {
  AvatarUploadSignature,
  ProfileView,
  apiResponse,
} from '@cadence/types';
import type { UpdateProfileDetailsInput } from '@cadence/validation';

import { ApiError, apiRequest } from '@/lib/api/request';

/** The signed-in user's profile, with the picture to show (returned bare). */
export function getProfile() {
  return apiRequest<ProfileView>('GET', '/profile');
}

/** Display name and/or day boundary. */
export async function updateProfile(input: UpdateProfileDetailsInput) {
  return (await apiRequest<apiResponse<ProfileView>>('PATCH', '/profile', input))
    .data!;
}

/** A signed upload the server built for a new avatar. */
export async function requestAvatarUpload() {
  return (
    await apiRequest<apiResponse<AvatarUploadSignature>>(
      'POST',
      '/profile/avatar/signature',
    )
  ).data!;
}

/** Adopt an uploaded image as the avatar; the old one is deleted. */
export async function setAvatar(publicId: string) {
  return (
    await apiRequest<apiResponse<ProfileView>>('PUT', '/profile/avatar', {
      publicId,
    })
  ).data!;
}

/** Remove the uploaded avatar (a Google/GitHub picture stays). */
export async function removeAvatar() {
  return (await apiRequest<apiResponse<ProfileView>>('DELETE', '/profile/avatar'))
    .data!;
}

/**
 * Upload the cropped image straight to Cloudinary with the server's
 * signature. Returns the public_id Cloudinary stored it under.
 */
export async function uploadAvatarImage(
  upload: AvatarUploadSignature,
  image: Blob,
): Promise<string> {
  const form = new FormData();

  form.append('file', image);
  form.append('api_key', upload.apiKey);
  form.append('signature', upload.signature);

  for (const [key, value] of Object.entries(upload.params)) {
    form.append(key, String(value));
  }

  let response: Response;

  try {
    response = await fetch(upload.uploadUrl, { method: 'POST', body: form });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'The image service could not be reached.');
  }

  const result = (await response.json().catch(() => ({}))) as {
    public_id?: string;
    error?: { message?: string };
  };

  if (!response.ok || !result.public_id) {
    throw new ApiError(
      response.status,
      'CLOUDINARY_UPLOAD_FAILED',
      result.error?.message ?? 'The image could not be uploaded.',
    );
  }

  return result.public_id;
}
