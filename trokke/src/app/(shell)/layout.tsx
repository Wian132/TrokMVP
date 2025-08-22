// src/app/(shell)/layout.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/client';
import { AuthProvider } from '@/components/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import Chatbot from '@/components/Chatbot';

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const pageTitle = useMemo(() => {
    // UPDATED: New and renamed titles
    const routeTitles: Record<string, string> = {
      '/admin/trucks': 'Fleet Overview',
      '/admin/fleet-analytics': 'Fleet Analytics',
      '/admin/clients': 'Manage Clients',
      '/admin/workers': 'Manage Workers',
      '/admin/link-workers': 'Link Worker Names',
      '/admin/trips': 'View Truck Trips',
      '/admin/my-shops': 'Manage My Shops',
      '/client/dashboard': 'Dashboard',
      '/client/my-shops': 'My Shops',
      '/worker/dashboard': 'Dashboard',
      '/worker/my-truck': 'My Assigned Truck',
      '/worker/pre-trip-check': 'Pre-Trip Vehicle Check',
      '/worker/log-trip': 'Log Trip',
      '/refueler/dashboard': 'Refueler Dashboard',
      '/refueler/refuels': 'Log Refuel',
    };
    
    // Find a matching title, including for dynamic child routes
    for (const route in routeTitles) {
        if (pathname.startsWith(route)) {
            return routeTitles[route];
        }
    }
    
    return 'Dashboard'; // Default title
  }, [pathname]);


  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error || !profile) {
        console.error('Error fetching profile or profile not found:', error);
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }
      setUserRole(profile.role);
      setIsLoading(false);
    };
    checkUser();
  }, [supabase, router]);


  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="text-center">
                <p className="text-lg font-semibold text-gray-700">Loading Session...</p>
            </div>
        </div>
    );
  }

  return (
    <AuthProvider serverSession={null}>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        {userRole && (
            <Sidebar 
                userRole={userRole} 
                isSidebarOpen={isSidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />
        )}
        
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <Navbar setSidebarOpen={setSidebarOpen} pageTitle={pageTitle} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>

        {userRole && <Chatbot userRole={userRole} />}
      </div>
    </AuthProvider>
  );
}
