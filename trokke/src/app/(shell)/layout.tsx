'use client';

import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/client';
import { AuthProvider } from '@/components/AuthContext';
import { useEffect, useState } from 'react';
import Chatbot from '@/components/Chatbot';

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false); // State for mobile sidebar
  const supabase = createClient();
  const router = useRouter();


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
            <p className="text-lg font-semibold">Loading Session...</p>
        </div>
    );
  }

  return (
    <AuthProvider serverSession={null}>
      <div className="relative min-h-screen md:flex">
        {/* Sidebar */}
        {userRole && (
            <Sidebar 
                userRole={userRole} 
                isSidebarOpen={isSidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />
        )}
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <Navbar setSidebarOpen={setSidebarOpen} />
          <main className="flex-1 overflow-y-auto bg-gray-200 p-4 sm:p-6 md:p-8">
            {children}
          </main>
        </div>

        {/* Chatbot remains fixed */}
        {userRole && <Chatbot userRole={userRole} />}
      </div>
    </AuthProvider>
  );
}
