"use client";
import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and the user is not an admin, redirect them.
    if (!loading && profile?.role !== 'admin') {
      router.push('/login'); // Or a dedicated "unauthorized" page
    }
  }, [loading, profile, router]);

  // While loading or if the user is not an admin, show a loading indicator.
  // This prevents the page content from flashing before the redirect.
  if (loading || profile?.role !== 'admin') {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <p>Loading...</p>
        </div>
    );
  }

  // If the user is an admin, show the page content.
  return <>{children}</>;
}
