import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

/*
 * Cloudinary, configured from the server's environment:
 *
 *   CLOUDINARY_CLOUD_NAME             your cloud name
 *   CLOUDINARY_API_KEY                API key
 *   CLOUDINARY_API_SECRET             API secret (server only, never sent)
 *   CLOUDINARY_AVATAR_UPLOAD_PRESET   optional: a SIGNED upload preset for
 *                                     avatars (delivery type authenticated)
 *
 * Read lazily so the server still starts without them; avatar routes then
 * answer CLOUDINARY_NOT_CONFIGURED (503) instead of crashing at boot.
 */

export type CloudinaryEnv = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  avatarPreset: string | null;
};

let configured: CloudinaryEnv | null = null;

export function getCloudinary(): { sdk: typeof cloudinary; env: CloudinaryEnv } {
  if (!configured) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('CLOUDINARY_NOT_CONFIGURED');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    configured = {
      cloudName,
      apiKey,
      apiSecret,
      avatarPreset: process.env.CLOUDINARY_AVATAR_UPLOAD_PRESET || null,
    };
  }

  return { sdk: cloudinary, env: configured };
}
