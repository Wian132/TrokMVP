// src/app/(shell)/worker/pre-trip-check/page.tsx
'use client';

// FIX: The page now imports the reusable component.
// All complex logic is handled within PreTripCheckComponent.
import PreTripCheckComponent from '@/components/pre-trip-check';

export default function PreTripCheckPage() {
  return <PreTripCheckComponent />;
}