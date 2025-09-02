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
      .select('roles(name)') // Join with the roles table
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.error('[HomePage] Error fetching profile or profile not found:', error?.message);
      console.log('[HomePage] Redirecting to /login due to missing profile.');
      redirect('/login');
    }
    
    // The role name is now nested inside the 'roles' object
    const userRole = Array.isArray(profile.roles) ? profile.roles[0]?.name : profile.roles?.name;
    console.log(`[HomePage] Profile found. User Role: ${userRole}`);

    switch (userRole) {
      case 'SuperAdmin':
      case 'Admin':
        console.log('[HomePage] Redirecting to /admin/trucks');
        redirect('/admin/trucks');
        break;
      case 'FloorManager':
        console.log('[HomePage] Redirecting to /floor-manager/dashboard');
        redirect('/floor-manager/dashboard');
        break;
      case 'Worker':
        console.log('[HomePage] Redirecting to /worker/dashboard');
        redirect('/worker/dashboard');
        break;
      case 'Client':
        console.log('[HomePage] Redirecting to /client/dashboard');
        redirect('/client/dashboard');
        break;
      case 'Refueler':
        console.log('[HomePage] Redirecting to /refueler/dashboard');
        redirect('/refueler/dashboard');
        break;
       case 'Checker':
        console.log('[HomePage] Redirecting to /checker/dashboard');
        redirect('/checker/dashboard');
        break;
      default:
        // This case will be hit if the role is unrecognized or null.
        console.log(`[HomePage] User has an unrecognized or null role: '${userRole}'. Redirecting to /login.`);
        redirect('/login');
    }
  }

  // If there is no user, redirect to login.
  console.log('[HomePage] No user found. Redirecting to /login.');
  redirect('/login');
}
