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
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // After sign out, always redirect to the login page.
    router.push('/login');
    router.refresh(); // Ensure the page reloads to clear any state.
  }, [supabase, router]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // If the user logs out from another tab, redirect them to login.
      if (_event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    // Also check the user on initial load to handle session restoration.
    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUser(user);
        }
        setLoading(false);
    };

    checkUser();

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const value = { session, user, signOut };

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

