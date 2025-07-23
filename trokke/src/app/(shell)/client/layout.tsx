'use client';

// This layout is nested inside the main (shell)/layout.tsx,
// which already handles authentication and the main app structure (Sidebar, Navbar).
// Therefore, this component can be simplified to just render its children.

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
