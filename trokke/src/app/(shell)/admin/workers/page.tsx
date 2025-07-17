"use client";
import { supabase } from "../../../../lib/supabaseClient";
import { useEffect, useState } from "react";

// Define the worker profile interface
interface WorkerProfile {
  id: string;
  full_name: string;
  contact_phone: string | null;
}

const WorkersPage = () => {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      // Fetch profiles where the role is 'worker'
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, contact_phone")
        .eq("role", "worker");

      if (error) {
        setError(error.message);
        console.error("Error fetching workers:", error.message);
      } else {
        setWorkers(data || []);
      }
      setLoading(false);
    };

    fetchWorkers();
  }, []);

  if (loading) {
    return <div className="p-6">Loading workers...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">
        Manage Workers
      </h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Phone
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workers.length > 0 ? (
                workers.map((worker) => (
                  <tr key={worker.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {worker.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {worker.contact_phone || 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No workers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WorkersPage;
