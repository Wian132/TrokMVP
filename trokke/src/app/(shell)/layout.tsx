// src/app/(shell)/layout.tsx
import { redirect } from 'next/navigation';
import { AuthProvider } from '@/components/AuthContext';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/server';

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    redirect('/login');
  }

  return (
    <AuthProvider serverSession={session}>
      <div className="flex h-screen bg-gray-100">
        <Sidebar userRole={session.user.user_metadata.role || 'client'} />
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
