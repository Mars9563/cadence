/**
 * Where the signed-in app lives. `/` is kept free for the public site
 * (home, about, ...); until that exists it simply forwards here.
 */
export const WORKSPACE_PATH = '/workspace';

/**
 * A redirect target taken from a URL (e.g. `next=`) only if it stays on this
 * site: a single leading slash, no `//` or `/\` (which browsers treat as
 * another host). Anything else becomes `fallback`.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string = WORKSPACE_PATH,
): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }

  return value;
}

/**
 * /auth pages a signed-in user may still open. Everything else under /auth
 * (sign-in, sign-up, forgot password) sends them to the workspace.
 */
const SIGNED_IN_AUTH_PATHS = ['/auth/update-password', '/auth/confirm'];

export function authPathAllowedWhenSignedIn(pathname: string): boolean {
  return SIGNED_IN_AUTH_PATHS.includes(pathname);
}
