import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import { createClient } from "@/utils/supabase/server";
import { ReactNode } from "react";
import Script from 'next/script'; // Import the Next.js Script component

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Construct the Google Maps script URL with your API key
  const googleMapsUrl = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;

  return (
    <html lang="en">
      <body>
        <AuthProvider serverSession={session}>
          {children}
        </AuthProvider>
        {/* Load the Google Maps script globally */}
        <Script src={googleMapsUrl} strategy="beforeInteractive" />
      </body>
    </html>
  );
}
