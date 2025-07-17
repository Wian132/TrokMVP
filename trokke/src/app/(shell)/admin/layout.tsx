'use client';

/**
 * This layout is now a simple pass-through component.
 * All route protection and authentication logic is handled by the
 * main ShellLayout, which is a parent to this component.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No complex logic needed here anymore.
  return <>{children}</>;
}
