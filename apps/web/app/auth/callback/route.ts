import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { WORKSPACE_PATH } from '@/lib/routes';

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/sign-in?error=missing_code', appUrl),
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('OAuth callback error:', error.message);

    return NextResponse.redirect(
      new URL('/auth/sign-in?error=oauth_callback', appUrl),
    );
  }

  return NextResponse.redirect(new URL(WORKSPACE_PATH, appUrl));
}
