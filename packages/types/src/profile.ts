export type Profile = {
  id: string;
  email: string | null;
  displayName: string | null;

  /**
   * External avatar URL, filled from OAuth metadata (Google / GitHub).
   */
  avatarUrl: string | null;

  /**
   * Cloudinary public_id of an avatar the user uploaded (email-auth users,
   * or anyone replacing their picture). Images use authenticated delivery,
   * so this is never a URL: the server signs a URL for it on request.
   *
   * Always `profiles/<id>/<name>` (enforced by the database).
   * When set, it takes precedence over `avatarUrl`.
   */
  avatarPublicId: string | null;

  /**
   * Time at which the user's Cadence day rolls over.
   *
   * Default:
   * 04:00:00
   *
   * Example:
   * With 04:00 as the boundary:
   *
   * 2026-09-10 03:59 -> Cadence date 2026-09-09
   * 2026-09-10 04:00 -> Cadence date 2026-09-10
   */
  dayEndTime: string;

  createdAt: string;
  updatedAt: string;
};

/**
 * A profile as the API returns it: the stored row plus the picture to show.
 *
 * `avatarSrc` is computed by the server, never stored: a signed Cloudinary
 * URL for `avatarPublicId` when set, else `avatarUrl`, else null.
 */
export type ProfileView = Profile & {
  avatarSrc: string | null;
};

/**
 * Everything a client needs to upload an avatar straight to Cloudinary.
 *
 * The server chooses and signs every upload parameter; the client sends
 * `params` exactly as given, plus `api_key`, `signature` and the file, as
 * multipart form data to `uploadUrl`. The API secret never leaves the server.
 */
export type AvatarUploadSignature = {
  uploadUrl: string;
  apiKey: string;
  signature: string;

  /** Signed parameters to send unchanged (timestamp, public_id, preset...). */
  params: Record<string, string | number>;

  /** The public_id the upload will get: `profiles/<user id>/avatar_<ts>`. */
  publicId: string;
};
