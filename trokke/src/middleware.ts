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
    // Prevent redirect loop for login page
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

  // FIX: Supabase might return the role as an object or an array of objects.
  // This code safely handles both cases.
  const roleRelation = profile?.roles;
  const userRole = Array.isArray(roleRelation) ? roleRelation[0]?.name : roleRelation?.name;

  // Define access control rules for different routes
  const roleAccessRules: Record<string, string[]> = {
    '/admin': ['SuperAdmin', 'Admin'],
    '/floor-manager': ['SuperAdmin', 'Admin', 'FloorManager'],
    '/refueler': ['SuperAdmin', 'Admin', 'FloorManager', 'Refueler'],
    '/checker': ['SuperAdmin', 'Admin', 'FloorManager', 'Checker'],
    // Worker is a general role, so we give them access to the worker section.
    '/worker': ['SuperAdmin', 'Admin', 'FloorManager', 'Refueler', 'Checker', 'Worker'], 
    '/client': ['SuperAdmin', 'Admin', 'Client'],
  };

  // Check if the user has access to the requested path
  for (const pathPrefix in roleAccessRules) {
    if (pathname.startsWith(pathPrefix)) {
      if (!userRole || !roleAccessRules[pathPrefix].includes(userRole)) {
        // *** CRITICAL FIX ***
        // Redirect unauthorized users to the ROOT page.
        // The root page will then correctly redirect them based on their role.
        return NextResponse.redirect(new URL('/', request.url)); 
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};