"use client";
import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and the user is not a worker, redirect them.
    if (!loading && profile?.role !== 'worker') {
      router.push('/login'); // Or a dedicated "unauthorized" page
    }
  }, [loading, profile, router]);

  // While loading or if the user is not a worker, show a loading indicator.
  if (loading || profile?.role !== 'worker') {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <p>Loading...</p>
        </div>
    );
  }

  // If the user is a worker, show the page content.
  return <>{children}</>;
}
