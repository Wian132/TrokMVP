import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Fleet & Logistics Hub",
  description: "Real-time logistics hub for fleet and store management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The root layout is now clean. It does not contain any auth logic or providers.
  // This ensures that public pages like /login are not wrapped in an auth context.
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
