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
  const supabase = createClient();

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);

      // Define truck statuses to query
      const truckStatuses = ['active', 'inactive', 'under_service', 'decommissioned'];

      // Create an array of promises for all queries
      const queries = [
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'worker'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('trucks').select('id', { count: 'exact', head: true }),
        supabase.from('business_stores').select('id', { count: 'exact', head: true }),
        supabase.from('client_stores').select('id', { count: 'exact', head: true }),
        // Add a query for each truck status
        ...truckStatuses.map(status =>
          supabase.from('trucks').select('id', { count: 'exact', head: true }).eq('status', status)
        )
      ];

      const results = await Promise.all(queries);

      // Destructure the results
      const [
        workersCount,
        clientsCount,
        trucksCount,
        businessStoresCount,
        clientStoresCount,
        ...statusCounts
      ] = results;

      // Start with the base metrics
      const newMetrics: Metric[] = [
        { name: 'Amount of Workers', value: workersCount.count ?? 0, icon: UsersIcon },
        { name: 'Amount of Clients', value: clientsCount.count ?? 0, icon: UserGroupIcon },
        { name: 'Total Trucks', value: trucksCount.count ?? 0, icon: TruckIcon },
        { name: 'Amount of Stores', value: businessStoresCount.count ?? 0, icon: BuildingStorefrontIcon },
        { name: 'Client Stores', value: clientStoresCount.count ?? 0, icon: BuildingStorefrontIcon },
      ];

      // Conditionally add truck status metrics if their count is > 0
      statusCounts.forEach((statusResult, index) => {
        if (statusResult.count && statusResult.count > 0) {
          const statusName = truckStatuses[index];
          newMetrics.splice(3, 0, { // Insert after Total Trucks
            name: `${statusName.charAt(0).toUpperCase() + statusName.slice(1).replace('_', ' ')} Trucks`,
            value: statusResult.count,
            icon: TruckIcon,
          });
        }
      });

      setMetrics(newMetrics);
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
    <div className="p-4 bg-gray-100 h-full">
      <h2 className="text-xl font-bold text-gray-800 mb-3">Analytics Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {metrics.map((metric) => (
          <div key={metric.name} className="bg-white p-3 rounded-lg shadow-md flex flex-col items-center justify-center">
            <metric.icon className="h-7 w-7 text-indigo-500 mb-1" />
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            <p className="text-xs font-medium text-gray-500 text-center">{metric.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
