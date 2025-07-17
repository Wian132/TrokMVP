'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { type Database } from '@/types/supabase';

type Truck = Database['public']['Tables']['trucks']['Row'];

export default function TrucksPage() {
  const supabase = createClient();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTruck, setNewTruck] = useState({
    license_plate: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
  });

  const fetchTrucks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("trucks").select("*");
    if (error) {
      setError(error.message);
    } else {
      setTrucks(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTrucks();
  }, [fetchTrucks]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTruck((prev) => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value, 10) || new Date().getFullYear() : value,
    }));
  };

  const handleCreateTruck = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const { error: insertError } = await supabase
      .from("trucks")
      .insert({
        license_plate: newTruck.license_plate,
        make: newTruck.make,
        model: newTruck.model,
        year: newTruck.year,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      await fetchTrucks();
      setNewTruck({ license_plate: "", make: "", model: "", year: new Date().getFullYear() });
    }
  };

  if (loading) return <div className="p-6">Loading trucks...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Manage Trucks</h1>
      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add a New Truck</h2>
        <form onSubmit={handleCreateTruck} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" name="license_plate" placeholder="License Plate" value={newTruck.license_plate} onChange={handleInputChange} required className="p-2 border rounded text-gray-900 placeholder-gray-600"/>
          <input type="text" name="make" placeholder="Make" value={newTruck.make} onChange={handleInputChange} required className="p-2 border rounded text-gray-900 placeholder-gray-600"/>
          <input type="text" name="model" placeholder="Model" value={newTruck.model} onChange={handleInputChange} required className="p-2 border rounded text-gray-900 placeholder-gray-600"/>
          <input type="number" name="year" placeholder="Year" value={newTruck.year} onChange={handleInputChange} required className="p-2 border rounded text-gray-900 placeholder-gray-600"/>
          <button type="submit" className="md:col-span-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Create Truck
          </button>
        </form>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Current Fleet</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">License Plate</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Make</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Year</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trucks.length > 0 ? (
                trucks.map((truck) => (
                  <tr key={truck.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{truck.license_plate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{truck.make}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{truck.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{truck.year}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No trucks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
