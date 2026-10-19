import type { EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { safeRedirectPath, WORKSPACE_PATH } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

const EMAIL_OTP_TYPES: EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
];

/**
 * Email links built from a token hash, e.g. the password-reset template:
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password
 *
 * verifyOtp signs the user in on THIS request (cookies on the response), so
 * the link works on any device, unlike the PKCE code flow, which needs the
 * browser that started it.
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const params = request.nextUrl.searchParams;

  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;

  if (!tokenHash || !type || !EMAIL_OTP_TYPES.includes(type)) {
    return NextResponse.redirect(new URL('/auth/sign-in?error=link_invalid', appUrl));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    console.error('Email link verification failed:', error.message);
    return NextResponse.redirect(new URL('/auth/sign-in?error=link_invalid', appUrl));
  }

  const fallback = type === 'recovery' ? '/auth/update-password' : WORKSPACE_PATH;

  return NextResponse.redirect(new URL(safeRedirectPath(params.get('next'), fallback), appUrl));
}
