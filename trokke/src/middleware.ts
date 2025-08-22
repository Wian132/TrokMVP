import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // Refresh session if expired - required for server components
  const { data: { session } } = await supabase.auth.getSession();

  // --- Get user and role directly from the database for accuracy ---
  let userRole: string | null = null;
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (profile) {
      userRole = profile.role;
    }
  }

  const { pathname } = request.nextUrl;

  // --- Redirect logic based on role and path ---

  // If a non-admin tries to access an admin route
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    const redirectUrl = userRole === 'client' ? '/client/dashboard' : userRole === 'worker' ? '/worker/dashboard' : '/login';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // If a non-client tries to access a client route
  if (pathname.startsWith('/client') && userRole !== 'client') {
    const redirectUrl = userRole === 'admin' ? '/admin/trucks' : userRole === 'worker' ? '/worker/dashboard' : '/login';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // If a non-worker tries to access a worker route
  if (pathname.startsWith('/worker') && userRole !== 'worker') {
    const redirectUrl = userRole === 'admin' ? '/admin/trucks' : userRole === 'client' ? '/client/dashboard' : '/login';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // If a non-refueler tries to access a refueler route
  if (pathname.startsWith('/refueler') && userRole !== 'refueler') {
      const redirectUrl = userRole === 'admin' ? '/admin/trucks' : userRole === 'client' ? '/client/dashboard' : '/login';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login
     * - signup
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)',
  ],
};
