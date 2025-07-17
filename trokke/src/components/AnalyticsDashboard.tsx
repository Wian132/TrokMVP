'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { UsersIcon, UserGroupIcon, TruckIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

// Define the structure for each analytics metric
interface Metric {
  name: string;
  value: number | string;
  icon: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, "ref"> & { title?: string; titleId?: string; } & React.RefAttributes<SVGSVGElement>>;
}

const AnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient(); // Correctly initialize the client

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);

      // Perform all count queries in parallel for efficiency
      const [
        workersCount,
        clientsCount,
        trucksCount,
        businessStoresCount,
        clientStoresCount
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'worker'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('trucks').select('id', { count: 'exact', head: true }),
        supabase.from('business_stores').select('id', { count: 'exact', head: true }),
        supabase.from('client_stores').select('id', { count: 'exact', head: true })
      ]);

      const initialMetrics: Metric[] = [
        { name: 'Amount of Workers', value: workersCount.count ?? 0, icon: UsersIcon },
        { name: 'Amount of Clients', value: clientsCount.count ?? 0, icon: UserGroupIcon },
        { name: 'Total Trucks', value: trucksCount.count ?? 0, icon: TruckIcon },
        { name: 'Active Trucks', value: 'N/A', icon: TruckIcon }, // Placeholder as requested
        { name: 'Amount of Stores', value: businessStoresCount.count ?? 0, icon: BuildingStorefrontIcon },
        { name: 'Client Stores', value: clientStoresCount.count ?? 0, icon: BuildingStorefrontIcon },
      ];

      setMetrics(initialMetrics);
      setLoading(false);
    };

    fetchCounts();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Loading Analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 h-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Analytics Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric) => (
          <div key={metric.name} className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
            <metric.icon className="h-8 w-8 text-indigo-500 mb-2" />
            <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
            <p className="text-sm font-medium text-gray-500 text-center">{metric.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;