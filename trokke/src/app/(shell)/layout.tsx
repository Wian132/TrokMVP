import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/server';
import { AuthProvider } from '@/components/AuthContext';

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('\n--- [ShellLayout] Checking authentication state on the server ---');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!user) {
    console.log('[ShellLayout] No authenticated user found. Redirecting to /login.');
    redirect('/login');
  }

  // --- CORRECTED ROLE FETCHING ---
  // Fetch the user's profile from the 'profiles' table to get the correct role.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // If there's no profile, something is wrong. Log out the user.
  if (!profile) {
    console.log('[ShellLayout] Could not find a profile for the user. Redirecting to /login.');
    redirect('/login');
  }

  const userRole = profile.role;
  console.log(`[ShellLayout] User is authenticated. ID: ${user.id}, Role: ${userRole}`);
  console.log('[ShellLayout] Rendering the protected layout with Sidebar and Navbar.');

  return (
    <AuthProvider serverSession={session}>
      <div className="flex h-screen bg-gray-100">
        <Sidebar userRole={userRole} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-4 sm:p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}