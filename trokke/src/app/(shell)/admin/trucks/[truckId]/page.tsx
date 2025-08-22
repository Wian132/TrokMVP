// src/app/(shell)/admin/trucks/[truckId]/page.tsx
'use client';

// This page now simply renders the client component.
// All data fetching is handled client-side to avoid the build error.
import TruckDetailsPageClient from './TruckDetailsPageClient';

export default function TruckDetailsPage() {
  return <TruckDetailsPageClient />;
}