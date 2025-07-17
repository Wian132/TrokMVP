"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({
  children,
  serverSession,
}: {
  children: React.ReactNode;
  serverSession: Session | null;
}) => {
  const supabase = createClient();
  const router = useRouter();
  
  const [session, setSession] = useState<Session | null>(serverSession);
  const [user, setUser] = useState<User | null>(serverSession?.user ?? null);
  // This loading state is the key to fixing the login loop.
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [supabase, router]);

  useEffect(() => {
    // This listener handles all auth changes after the initial load.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // Auth state is confirmed, stop loading.
    });

    // On initial mount, if there's no server session, we can stop loading.
    // This handles the case where a non-logged-in user somehow hits a protected route.
    if (!serverSession) {
        setLoading(false);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [serverSession, router, supabase]);
  
  // When the component first mounts, if we have a session from the server,
  // we can consider the user authenticated and stop loading immediately.
  useEffect(() => {
    if (serverSession) {
      setLoading(false);
    }
  }, [serverSession]);


  const value = { session, user, signOut };

  // Do not render the protected parts of the application until the client-side
  // auth check is complete. This prevents the flash of old content or redirects.
  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Loading session...</p>
        </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
