'use client';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { supabase } from '@/utils/supabase';

export default function SideNav() {
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="w-48 min-h-screen border-r p-4">
      <ul className="space-y-2">
        <li>
          <Link href="/">Home</Link>
        </li>
        {user && (
          <li>
            <Link href="/dashboard">Dashboard</Link>
          </li>
        )}
        {user ? (
          <li>
            <button onClick={handleLogout} className="text-left w-full">
              Logout
            </button>
          </li>
        ) : (
          <li>
            <Link href="/login">Login</Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
