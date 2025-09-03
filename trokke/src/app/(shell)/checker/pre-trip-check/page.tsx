'use client';

// This page reuses the same logic as the worker's pre-trip check page
// by importing the shared component directly.
import PreTripCheckComponent from '@/components/pre-trip-check';

export default function CheckerPreTripCheckPage() {
  return <PreTripCheckComponent />;
}