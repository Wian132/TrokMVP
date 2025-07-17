'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';

export default function HomePage() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      const userRole = session.user.user_metadata.role;
      switch (userRole) {
        case 'admin':
          router.push('/(shell)/admin/dashboard');
          break;
        case 'worker':
          router.push('/(shell)/worker/dashboard');
          break;
        case 'client':
          router.push('/(shell)/client/dashboard');
          break;
        default:
          router.push('/login');
      }
    } else {
        // If there is no session, redirect to login
        router.push('/login');
    }
  }, [session, router]);

  // Render a loading state or null while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
    </div>
  );
}
