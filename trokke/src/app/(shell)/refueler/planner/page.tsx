// src/app/(shell)/refueler/planner/page.tsx
'use client'; 

// --- FIX: Updated import for default export ---
import MobilePlanner from '@/components/MobilePlanner';

export default function RefuelerPlannerPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 text-black">
        <MobilePlanner />
    </div>
  );
}