// src/app/(shell)/worker/dashboard/page.tsx
'use client';

import { InfoIcon } from 'lucide-react';

// --- Main Page Component ---
export default function WorkerDashboardPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Worker Dashboard</h1>
        <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-6 rounded-lg shadow-md flex items-start gap-4">
          <InfoIcon className="h-8 w-8 text-blue-500 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-bold">Welcome!</h2>
            <p className="mt-2">
              Your account is currently set to the default &apos;Worker&apos; role. To access your tasks, please ask an administrator to assign you a specific role (like Refueler, Checker, or Floor Manager) on the &apos;Manage Roles&apos; page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}