# Profile and avatar API

All routes need `Authorization: Bearer <supabase access token>` and act on the
signed-in user's own profile; the user id always comes from the token.

| Method | Path | Body / query | Success |
|---|---|---|---|
| GET | `/profile` | none | `ProfileView` (bare, as before) |
| PATCH | `/profile` | `{ displayName?, dayEndTime? }` (at least one) | `{ success, data: ProfileView }` |
| POST | `/profile/avatar/signature` | none | `{ success, data: AvatarUploadSignature }` |
| PUT | `/profile/avatar` | `{ publicId }` | `{ success, data: ProfileView }` |
| DELETE | `/profile/avatar` | none (removes the uploaded picture; a Google/GitHub one stays) | `{ success, data: ProfileView }` |
| GET | `/profile/avatar` | `?size=64\|128\|256\|512` | `{ success, data: { url } }` |

`ProfileView` = `Profile` + `avatarSrc`: a signed 256px Cloudinary URL for
`avatarPublicId`, else the OAuth `avatarUrl`, else `null`.

Errors: `{ success: false, error: CODE, message }`.

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | body/query shape |
| `DAY_END_TIME_OUT_OF_RANGE` | 422 | boundary outside 00:00-08:00 (migration 001) |
| `DAY_END_TIME_MOVES_DATE_BACK` | 409 | change would reopen yesterday (migration 002) |
| `DISALLOWED_UPLOAD_PARAM` | 400 | a parameter outside the signing allow-list |
| `UPLOAD_TIMESTAMP_INVALID` | 400 | missing or older than 10 min |
| `UPLOAD_FOLDER_REQUIRED` | 400 | no folder / full public_id |
| `UPLOAD_FOLDER_NOT_ALLOWED` | 403 | not `profiles/<your id>` |
| `UPLOAD_PUBLIC_ID_NOT_ALLOWED` | 403 | bad name, or folder + full id |
| `UPLOAD_TYPE_NOT_ALLOWED` | 403 | delivery type other than `authenticated` |
| `UPLOAD_PRESET_NOT_ALLOWED` | 403 | not the configured avatar preset |
| `AVATAR_NOT_OWNED` | 403 | publicId outside your folder |
| `AVATAR_NOT_FOUND` | 404 | no authenticated image with that id |
| `NO_AVATAR` | 404 | GET avatar URL with no uploaded avatar |
| `PROFILE_NOT_FOUND` | 404 | |
| `CLOUDINARY_NOT_CONFIGURED` | 503 | env vars missing |
| `CLOUDINARY_UNAVAILABLE` | 502 | Cloudinary lookup failed |

## Upload flow (what the settings modal does)

1. The user picks a JPG/PNG/WebP up to 10 MB and frames it in a circular
   cutout (react-easy-crop). The browser renders only the framed square at
   512x512 (WebP, else JPEG). The circle is a preview; the stored image is
   square and every display crops it round.
2. `POST /profile/avatar/signature` (no body). The server chooses every
   parameter (fresh `timestamp`, `public_id` = `profiles/<user id>/avatar_<ts>`,
   the avatar `upload_preset`, or `type: authenticated` without a preset),
   runs them through the same allow-list checks, signs them, and returns
   `{ uploadUrl, apiKey, signature, params, publicId }`.
3. The browser posts multipart form data to `uploadUrl`: `file`, `api_key`,
   `signature`, and every entry of `params` unchanged.
4. `PUT /profile/avatar { publicId }`. The server checks the id is in the
   user's folder and exists as an authenticated image, saves it, and deletes
   the previous avatar image.

The resulting public_id must be `profiles/<user id>/<name>`; the database
rejects anything else (`profiles_avatar_public_id_shape`, migration 003).
The server always sends the full `public_id` (no `folder` param), which is
correct on fixed- and dynamic-folder accounts. The avatar upload preset must
not set its own folder or public_id options, or Cloudinary would store the
image somewhere the database refuses.

Not here on purpose: email and password changes go through Supabase Auth on
the client (`supabase.auth.updateUser`), which handles confirmation; the
server never writes `profiles.email`.
