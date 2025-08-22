// src/app/(shell)/admin/trucks/[truckId]/services/page.tsx
'use client';

// This page now acts as a simple client-side entry point.
// All data fetching logic is handled in the ServiceHistoryPageClient component
// to resolve the persistent Next.js build error.
import ServiceHistoryPageClient from './ServiceHistoryPageClient';

export default function ServiceHistoryPage() {
  return <ServiceHistoryPageClient />;
}