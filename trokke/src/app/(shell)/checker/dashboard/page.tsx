// src/app/(shell)/checker/dashboard/page.tsx
'use client';

import { useAuth } from '@/components/AuthContext';
import { WrenchScrewdriverIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

export default function CheckerDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800">Checker Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome, {user?.email}!</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link href="/checker/pre-trip-check" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <WrenchScrewdriverIcon className="h-10 w-10 text-indigo-600" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">Perform a Check</h2>
                <p className="text-sm text-gray-600">Complete a pre-trip check for any vehicle.</p>
              </div>
            </div>
          </Link>

          <div className="bg-gray-100 p-6 rounded-lg shadow-md">
             <div className="flex items-center gap-4">
              <ChartBarIcon className="h-10 w-10 text-gray-400" />
              <div>
                <h2 className="text-lg font-bold text-gray-500">View Analytics</h2>
                <p className="text-sm text-gray-500">(Coming Soon)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}