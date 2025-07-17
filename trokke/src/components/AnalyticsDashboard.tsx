'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define a type for our analytics data
type AnalyticsData = {
  name: string;
  count: number;
};

const AnalyticsDashboard = () => {
  const [data, setData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // We'll fetch the counts of trucks, workers, and clients in parallel
        const [trucks, workers, clients] = await Promise.all([
          supabase.from('trucks').select('id', { count: 'exact', head: true }),
          supabase.from('workers').select('id', { count: 'exact', head: true }),
          supabase.from('clients').select('id', { count: 'exact', head: true }),
        ]);

        const analyticsData = [
          { name: 'Trucks', count: trucks.count ?? 0 },
          { name: 'Workers', count: workers.count ?? 0 },
          { name: 'Clients', count: clients.count ?? 0 },
        ];

        setData(analyticsData);
      } catch (error) {
        if (error instanceof Error) {
            console.error('Error fetching analytics data:', error.message);
        } else {
            console.error('An unknown error occurred while fetching analytics data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  if (loading) {
    return <div className="p-4 text-center">Loading Analytics...</div>;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Fleet & Client Overview</h3>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" name="Total Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
