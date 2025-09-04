// src/app/(shell)/admin/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import { RefreshCw } from 'lucide-react';

// Define the shape of the data returned by our new SQL function
export type SuperAdminDashboardMetrics = {
  total_workers: number;
  total_trucks: number;
  total_diesel_cost: number;
  total_km_traveled: number;
  total_trips: number;
  total_liters_fueled: number;
  total_service_cost: number;
  total_spillage: number;
  total_checks: number;
  total_refuels: number;
  role_breakdown: { role: string; count: number }[];
  avg_cost_per_km: number;
  overall_kml: number;
  active_trucks: number;
  inactive_trucks: number;
};

export default function SuperAdminDashboardPage() {
  const [metrics, setMetrics] = useState<SuperAdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('get_superadmin_dashboard_metrics');
      if (error) throw error;
      // The RPC returns an array with one object
      setMetrics(data[0]); 
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8 text-gray-500" />
        <span className="ml-4 text-gray-700">Loading Dashboard Metrics...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {metrics ? (
        <SuperAdminDashboard initialMetrics={metrics} onRefresh={fetchMetrics} />
      ) : (
        <div className="text-center">No dashboard data available.</div>
      )}
    </div>
  );
}
