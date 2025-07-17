import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../components/AuthContext'; // Import the AuthProvider

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Smart Fleet & Logistics Hub',
  description: 'Real-time logistics hub for fleet management.',
};

/**
 * This is the root layout for the entire application.
 * We wrap the application's children with the AuthProvider here
 * to make the authentication state (user, role, etc.) available
 * to all components.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
