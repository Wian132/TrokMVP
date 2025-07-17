import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

// This is now a Server Component, which is more robust for handling initial redirects.
export default async function HomePage() {
  console.log('\n--- [HomePage] Server Component: Deciding initial redirect ---');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    console.log(`[HomePage] User found. ID: ${user.id}. Now fetching profile.`);

    // Fetch the user's profile from the 'profiles' table to get the role.
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.error('[HomePage] Error fetching profile or profile not found:', error?.message);
      console.log('[HomePage] Redirecting to /login due to missing profile.');
      redirect('/login');
    }

    const userRole = profile.role;
    console.log(`[HomePage] Profile found. User Role: ${userRole}`);

    switch (userRole) {
      case 'admin':
        console.log('[HomePage] Redirecting to /admin/dashboard');
        redirect('/admin/dashboard');
        break;
      case 'worker':
        console.log('[HomePage] Redirecting to /worker/dashboard');
        redirect('/worker/dashboard');
        break;
      case 'client':
        console.log('[HomePage] Redirecting to /client/dashboard');
        redirect('/client/dashboard');
        break;
      default:
        // This case will be hit if the role is unrecognized.
        console.log(`[HomePage] User has an unrecognized role: '${userRole}'. Redirecting to /login.`);
        redirect('/login');
    }
  }

  // If there is no user, redirect to login.
  console.log('[HomePage] No user found. Redirecting to /login.');
  redirect('/login');
}
