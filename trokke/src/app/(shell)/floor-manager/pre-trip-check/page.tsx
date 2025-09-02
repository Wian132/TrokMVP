// src/app/(shell)/floor-manager/pre-trip-check/page.tsx
'use client';

// This page reuses the same logic as the worker's pre-trip check page.
// The component has been updated to handle different roles.
import PreTripCheckPage from '../../worker/pre-trip-check/page';

export default function FloorManagerPreTripCheckPage() {
  return <PreTripCheckPage />;
}
