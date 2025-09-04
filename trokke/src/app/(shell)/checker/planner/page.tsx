// src/app/(shell)/checker/planner/page.tsx
'use client'; 

// --- FIX: Updated import for default export ---
import MobilePlanner from '@/components/MobilePlanner';

export default function CheckerPlannerPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 text-black">
        <MobilePlanner />
    </div>
  );
}