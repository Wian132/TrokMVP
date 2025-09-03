'use client';

import React from 'react';

// This layout is nested inside the main (shell)/layout.tsx,
// which already handles authentication and the main app structure.
// We can simplify this to just render the children.
export default function CheckerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}