// src/app/(shell)/admin/clients/[id]/page.tsx
'use client';

// This page now acts as a simple entry point for the client component.
// All data fetching and logic will be handled within ClientStoresPageClient.

import ClientStoresPageClient from './ClientStoresPageClient';

export default function ClientStoresPage() {
  // The component no longer needs to be async or handle data fetching.
  // It simply renders the client-side component which will manage its own state.
  return <ClientStoresPageClient />;
}