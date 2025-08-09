// src/app/(shell)/admin/trips/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { type Database } from '@/types/supabase';

type Truck = Pick<Database['public']['Tables']['trucks']['Row'], 'id' | 'license_plate'>;
type Trip = Database['public']['Tables']['truck_trips']['Row'];

const TRIPS_PER_PAGE = 15;

// Changed to a const declaration, which can sometimes resolve build issues.
const TripsPage = () => {
  const supabase = createClient();
  
  // State for data
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [trips, setTrips] = useState<Trip[]>([]);
  
  // State for UI
  const [loadingTrucks, setLoadingTrucks] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch all trucks for the dropdown selector
  useEffect(() => {
    const fetchTrucks = async () => {
      setLoadingTrucks(true);
      const { data, error } = await supabase
        .from('trucks')
        .select('id, license_plate')
        .order('license_plate', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setTrucks(data || []);
      }
      setLoadingTrucks(false);
    };
    fetchTrucks();
  }, [supabase]);

  // Fetch trips when a truck is selected
  useEffect(() => {
    if (!selectedTruckId) {
      setTrips([]);
      return;
    }

    const fetchTrips = async () => {
      setLoadingTrips(true);
      setError(null);
      setCurrentPage(1); // Reset to first page on new selection

      const { data, error } = await supabase
        .from('truck_trips')
        .select('*')
        .eq('truck_id', selectedTruckId)
        .order('trip_date', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setTrips(data || []);
      }
      setLoadingTrips(false);
    };

    fetchTrips();
  }, [selectedTruckId, supabase]);

  // Memoized pagination calculation
  const paginatedTrips = useMemo(() => {
    const startIndex = (currentPage - 1) * TRIPS_PER_PAGE;
    return trips.slice(startIndex, startIndex + TRIPS_PER_PAGE);
  }, [trips, currentPage]);

  const totalPages = Math.ceil(trips.length / TRIPS_PER_PAGE);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">View Truck Trips</h1>
      
      {error && (
        <div className="my-4 p-3 rounded-md text-sm bg-red-100 text-red-800">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Truck Selector */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <label htmlFor="truck-select" className="block text-lg font-semibold text-gray-700 mb-2">
          Select a Truck
        </label>
        <select
          id="truck-select"
          value={selectedTruckId}
          onChange={(e) => setSelectedTruckId(e.target.value)}
          disabled={loadingTrucks}
          className="w-full max-w-md p-2 border rounded-md text-gray-900 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="" disabled>
            {loadingTrucks ? 'Loading trucks...' : '--- Please select a truck ---'}
          </option>
          {trucks.map((truck) => (
            <option key={truck.id} value={truck.id}>
              {truck.license_plate}
            </option>
          ))}
        </select>
      </div>

      {/* Trips Table */}
      {selectedTruckId && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Trip History for {trucks.find(t => t.id.toString() === selectedTruckId)?.license_plate}
          </h2>
          {loadingTrips ? (
            <p>Loading trips...</p>
          ) : trips.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opening Km</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Km</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Closing Km</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Litres</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedTrips.map((trip) => (
                      <tr key={trip.id}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">{formatDate(trip.trip_date)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{trip.worker_name || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{trip.opening_km?.toLocaleString() ?? '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{trip.total_km?.toLocaleString() ?? '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 font-medium text-right">{trip.closing_km?.toLocaleString() ?? '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{trip.liters_filled?.toLocaleString() ?? '-'}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 truncate max-w-xs">{trip.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500">No trips found for this truck.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TripsPage;
