// src/app/(shell)/worker/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import Link from 'next/link';
import { CheckCircleIcon, XCircleIcon, ArrowRightIcon } from '@heroicons/react/24/solid';

// --- Main Page Component ---
export default function WorkerDashboardPage() {
  const supabase = createClient();
  const { user } = useAuth();

  const [hasDonePreTrip, setHasDonePreTrip] = useState(false);
  const [hasLoggedTrip, setHasLoggedTrip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStatus = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Get Worker and their assigned truck
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id, trucks(id)')
        .eq('profile_id', user.id)
        .single();

      if (workerError || !workerData) throw new Error("Could not find your worker profile.");
      
      const truckId = workerData.trucks?.[0]?.id;
      if (!truckId) throw new Error("You are not assigned to a truck.");

      const today = new Date().toISOString().slice(0, 10);

      // 2. Check for a pre-trip check today
      const { data: preTripCheck, error: preTripError } = await supabase
        .from('pre_trip_checks')
        .select('id')
        .eq('truck_id', truckId)
        .gte('checked_at', `${today}T00:00:00Z`)
        .limit(1)
        .single();
      
      if (preTripError && preTripError.code !== 'PGRST116') throw preTripError; // Ignore 'not found' errors
      setHasDonePreTrip(!!preTripCheck);

      // 3. Check for a trip log today
      const { data: tripLog, error: tripLogError } = await supabase
        .from('truck_trips')
        .select('id')
        .eq('truck_id', truckId)
        .eq('trip_date', today)
        .limit(1)
        .single();

      if (tripLogError && tripLogError.code !== 'PGRST116') throw tripLogError; // Ignore 'not found' errors
      setHasLoggedTrip(!!tripLog);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchDashboardStatus();
  }, [fetchDashboardStatus]);

  if (loading) {
    return <div className="p-8 text-center font-semibold text-gray-700">Loading your daily tasks...</div>;
  }
  
  if (error) {
    return <div className="p-8 text-center text-red-600 bg-red-50 rounded-md max-w-md mx-auto">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Daily Tasks</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatusCard
            title="Pre-Trip Vehicle Check"
            isComplete={hasDonePreTrip}
            completeText="You have completed your pre-trip check for today."
            incompleteText="You still need to complete your pre-trip check."
            link="/worker/pre-trip-check"
            actionText="Go to Check"
          />
          <StatusCard
            title="Daily Trip Log"
            isComplete={hasLoggedTrip}
            completeText="You have logged your trip for today."
            incompleteText="You still need to log your trip and refuel information."
            link="/worker/log-trip"
            actionText="Go to Log"
          />
        </div>
      </div>
    </div>
  );
}

// --- Reusable Status Card Component ---
interface StatusCardProps {
    title: string;
    isComplete: boolean;
    completeText: string;
    incompleteText: string;
    link: string;
    actionText: string;
}

const StatusCard = ({ title, isComplete, completeText, incompleteText, link, actionText }: StatusCardProps) => {
    const statusColor = isComplete ? 'text-green-600' : 'text-red-600';
    const bgColor = isComplete ? 'bg-green-50' : 'bg-red-50';
    const Icon = isComplete ? CheckCircleIcon : XCircleIcon;

    return (
        <div className={`p-6 rounded-lg shadow-md flex flex-col ${bgColor}`}>
            <h2 className="text-lg font-bold text-gray-800 mb-3">{title}</h2>
            <div className="flex items-center gap-3 mb-4">
                <Icon className={`h-8 w-8 flex-shrink-0 ${statusColor}`} />
                <p className={`font-semibold ${statusColor}`}>
                    {isComplete ? completeText : incompleteText}
                </p>
            </div>
            <div className="mt-auto">
                <Link href={link}>
                    <button className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 font-semibold transition-colors">
                        {actionText} <ArrowRightIcon className="h-4 w-4"/>
                    </button>
                </Link>
            </div>
        </div>
    );
};
