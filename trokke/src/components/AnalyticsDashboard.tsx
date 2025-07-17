'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AnalyticsDashboard = () => {
  const [data, setData] = useState([]);
  const supabase = createClient(); // Use the new client utility

  useEffect(() => {
    const fetchData = async () => {
      // Replace with your actual data fetching logic
      const { data: fetchedData, error } = await supabase
        .from('your_table_name') // TODO: Replace with your actual table
        .select('name, value');

      if (error) {
        console.error('Error fetching analytics data:', error);
      } else if (fetchedData) {
        // @ts-ignore
        setData(fetchedData);
      }
    };

    fetchData();
  }, [supabase]);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Analytics</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsDashboard;
