import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { authPathAllowedWhenSignedIn, WORKSPACE_PATH } from '@/lib/routes';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/auth');

  // Signed-in users skip sign-in/sign-up, but may finish a password reset.
  if (user && isAuthRoute && !authPathAllowedWhenSignedIn(pathname)) {
    return NextResponse.redirect(new URL(WORKSPACE_PATH, request.url));
  }

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';

    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
