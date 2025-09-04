// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/supabase'; // Import generated types

export async function middleware(request: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/signup', '/auth/callback'];
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // If no session, redirect to login
  if (!session) {
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Get user role from the 'profiles' table by joining 'roles'
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles(name)')
    .eq('id', session.user.id)
    .single();

  const roleRelation = profile?.roles;
  const userRole = Array.isArray(roleRelation) ? roleRelation[0]?.name : roleRelation?.name;

  // Define access control rules for different routes
  const roleAccessRules: Record<string, string[]> = {
    '/admin/dashboard': ['SuperAdmin'],
    '/admin': ['SuperAdmin', 'Admin'],
    '/floor-manager': ['SuperAdmin', 'Admin', 'FloorManager'],
    '/refueler': ['SuperAdmin', 'Admin', 'FloorManager', 'Refueler'],
    '/checker': ['SuperAdmin', 'Admin', 'FloorManager', 'Checker'],
    '/worker': ['SuperAdmin', 'Admin', 'FloorManager', 'Refueler', 'Checker', 'Worker'], 
    '/client': ['SuperAdmin', 'Admin', 'Client'],
  };

  // Check if the user has access to the requested path
  for (const pathPrefix in roleAccessRules) {
    if (pathname.startsWith(pathPrefix)) {
      if (!userRole || !roleAccessRules[pathPrefix].includes(userRole)) {
        // Redirect to a safe default page if access is denied
        return NextResponse.redirect(new URL('/', request.url)); 
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
