// src/app/(shell)/floor-manager/refuels/page.tsx
'use client';

// This page reuses the same logic as the refueler's page.
// The component is designed to work for any user who has access to it.
import LogRefuelPage from '../../refueler/refuels/page';

export default function FloorManagerRefuelPage() {
  return <LogRefuelPage />;
}
