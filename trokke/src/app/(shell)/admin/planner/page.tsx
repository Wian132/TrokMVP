// src/app/(shell)/admin/planner/page.tsx
'use client'; 

import { Planner } from '@/components/Planner';

export default function PlannerPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 text-black">
        {/* Admins get the fully interactive planner */}
        <Planner readOnly={false} />
    </div>
  );
}