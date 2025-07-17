'use client';

import { useAuth } from '@/components/AuthContext';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The old `loading` and `profile` properties are gone.
  // The main auth check is now done in the parent `(shell)/layout.tsx`.
  const { session } = useAuth();

  if (!session) {
    // This provides a fallback loading state while the redirect happens.
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
