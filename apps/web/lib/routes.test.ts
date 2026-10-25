import { describe, expect, it } from 'vitest';

import { authPathAllowedWhenSignedIn, isPublicPath, safeRedirectPath, WORKSPACE_PATH } from './routes';

describe('safeRedirectPath', () => {
  it('keeps a path inside the app', () => {
    expect(safeRedirectPath('/auth/update-password')).toBe('/auth/update-password');
    expect(safeRedirectPath('/workspace?tab=notes')).toBe('/workspace?tab=notes');
  });

  it('falls back for anything that could leave the site', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'evil', '', null]) {
      expect(safeRedirectPath(bad)).toBe(WORKSPACE_PATH);
    }
  });

  it('uses the given fallback', () => {
    expect(safeRedirectPath(null, '/auth/update-password')).toBe('/auth/update-password');
  });
});

describe('authPathAllowedWhenSignedIn', () => {
  it('lets a signed-in user finish a password reset', () => {
    expect(authPathAllowedWhenSignedIn('/auth/update-password')).toBe(true);
    expect(authPathAllowedWhenSignedIn('/auth/confirm')).toBe(true);
  });

  it('still sends signed-in users away from sign-in and sign-up', () => {
    expect(authPathAllowedWhenSignedIn('/auth/sign-in')).toBe(false);
    expect(authPathAllowedWhenSignedIn('/auth/sign-up')).toBe(false);
    expect(authPathAllowedWhenSignedIn('/auth/forgot-password')).toBe(false);
  });
});

describe('isPublicPath', () => {
  it('lets anyone read the home page and the legal pages', () => {
    expect(isPublicPath('/')).toBe(true);
    expect(isPublicPath('/privacy')).toBe(true);
    expect(isPublicPath('/terms')).toBe(true);
  });

  it('keeps the app and lookalike paths private', () => {
    expect(isPublicPath('/workspace')).toBe(false);
    expect(isPublicPath('/privacy-settings')).toBe(false);
    expect(isPublicPath('/terms/../workspace')).toBe(false);
    expect(isPublicPath('//')).toBe(false);
  });
});
