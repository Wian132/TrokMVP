// src/app/(shell)/worker/log-trip/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { type Database } from '@/types/supabase';
import { TruckIcon, PlusCircleIcon, BookOpenIcon, PencilIcon } from '@heroicons/react/24/outline';

// --- Type Definitions ---
type TruckInfo = { id: number; license_plate: string; make: string | null; model: string | null, current_odo: number | null };
type WorkerInfo = { id: number; };
type Trip = Database['public']['Tables']['truck_trips']['Row'];

// --- Main Page Component ---
export default function LogTripPage() {
  const supabase = createClient();
  const { user } = useAuth();

  const [truck, setTruck] = useState<TruckInfo | null>(null);
  const [worker, setWorker] = useState<WorkerInfo | null>(null);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [todaysTrip, setTodaysTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form state
  const [openingKm, setOpeningKm] = useState('');
  const [litersFilled, setLitersFilled] = useState('');
  const [notes, setNotes] = useState('');

  const isEditing = !!todaysTrip;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data: workerData, error: workerError } = await supabase.from('workers').select('id').eq('profile_id', user.id).single();
    if (workerError || !workerData) {
      setError("Could not find your worker profile.");
      setLoading(false);
      return;
    }
    setWorker(workerData);

    const { data: truckData, error: truckError } = await supabase.from('trucks').select('id, license_plate, make, model, current_odo').eq('assigned_worker_id', workerData.id).single();
    if (truckError || !truckData) {
      setError("You are not assigned to a truck.");
      setLoading(false);
      return;
    }
    setTruck(truckData);

    const { data: tripsData, error: tripsError } = await supabase.from('truck_trips').select('*').eq('truck_id', truckData.id).order('trip_date', { ascending: false }).limit(5);
    if (tripsError) {
      console.error("Error fetching recent trips:", tripsError);
      setRecentTrips([]);
    } else {
      setRecentTrips(tripsData || []);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const mostRecentTrip = tripsData && tripsData.length > 0 ? tripsData[0] : null;

      if (mostRecentTrip && new Date(mostRecentTrip.trip_date!) >= today) {
        setTodaysTrip(mostRecentTrip);
        setOpeningKm(mostRecentTrip.opening_km?.toString() || '');
        setLitersFilled(mostRecentTrip.liters_filled?.toString() || '');
        setNotes(mostRecentTrip.notes || '');
      } else {
        setTodaysTrip(null);
        setOpeningKm(truckData.current_odo?.toString() || '');
        setLitersFilled('');
        setNotes('');
      }
    }
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditClick = (trip: Trip) => {
      setTodaysTrip(trip);
      setOpeningKm(trip.opening_km?.toString() || '');
      setLitersFilled(trip.liters_filled?.toString() || '');
      setNotes(trip.notes || '');
      window.scrollTo(0, 0); // Scroll to top to see the form
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (!truck || !worker) {
      setError("Missing truck or worker information.");
      return;
    }
    setStatusMessage(isEditing ? "Updating trip log..." : "Submitting trip log...");

    const openingKmFloat = parseFloat(openingKm);
    const litersFilledFloat = parseFloat(litersFilled);

    if (isNaN(openingKmFloat) || openingKmFloat <= 0) {
      setError("Please enter a valid odometer reading.");
      setStatusMessage(null);
      return;
    }
    if (litersFilled !== '' && (isNaN(litersFilledFloat) || litersFilledFloat < 0)) {
      setError("Please enter a valid value for liters refueled.");
      setStatusMessage(null);
      return;
    }

    if (isEditing && todaysTrip) {
      // --- UPDATE LOGIC ---
      const { error: updateError } = await supabase
        .from('truck_trips')
        .update({
          opening_km: openingKmFloat,
          liters_filled: litersFilled === '' ? null : litersFilledFloat,
          notes: notes,
        })
        .eq('id', todaysTrip.id);

      if (updateError) {
        setError(`Update failed: ${updateError.message}`);
        setStatusMessage(null);
      } else {
        await supabase.from('trucks').update({ current_odo: openingKmFloat }).eq('id', truck.id);
        setStatusMessage("Trip updated successfully!");
        fetchData();
      }
    } else {
      // --- INSERT LOGIC ---
      const { data: lastTrip } = await supabase.from('truck_trips').select('opening_km').eq('truck_id', truck.id).order('opening_km', { ascending: false }).limit(1).single();
      let total_km = 0;
      if (lastTrip && lastTrip.opening_km && openingKmFloat > lastTrip.opening_km) {
        total_km = openingKmFloat - lastTrip.opening_km;
      }

      const { error: insertError } = await supabase.from('truck_trips').insert({
        truck_id: truck.id,
        worker_id: worker.id,
        worker_name: user?.email,
        trip_date: new Date().toISOString(),
        opening_km: openingKmFloat,
        liters_filled: litersFilled === '' ? null : litersFilledFloat,
        notes: notes,
        total_km: total_km,
      });

      if (insertError) {
        setError(`Submission failed: ${insertError.message}`);
        setStatusMessage(null);
      } else {
        await supabase.from('trucks').update({ current_odo: openingKmFloat }).eq('id', truck.id);
        setStatusMessage("Trip logged successfully!");
        fetchData();
      }
    }
  };

  const isTripEditable = (tripDate: string | null): boolean => {
      if (!tripDate) return false;
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(tripDate) > twentyFourHoursAgo;
  }

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (error && !truck) return <div className="p-4 text-center text-red-500 font-semibold">{error}</div>;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-4 border-b pb-4 mb-4">
          <TruckIcon className="h-10 w-10 text-indigo-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">{isEditing ? "Edit Today's Trip" : "Log New Trip"}</h1>
            <p className="text-sm text-gray-600">{truck?.make} {truck?.model} - {truck?.license_plate}</p>
          </div>
        </div>

        {statusMessage && <p className="mb-4 text-center text-sm text-green-600 bg-green-50 p-3 rounded-md">{statusMessage}</p>}
        {error && <p className="mb-4 text-center text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="opening_km" className="block text-sm font-medium text-gray-700">Current Odometer Reading (km)</label>
            <input id="opening_km" type="number" value={openingKm} onChange={(e) => setOpeningKm(e.target.value)} required className="mt-1 w-full p-2 border rounded-md text-gray-900 shadow-sm" />
          </div>
          <div>
            <label htmlFor="liters_filled" className="block text-sm font-medium text-gray-700">Liters Refueled (if any)</label>
            <input id="liters_filled" type="number" step="0.01" placeholder="0.00" value={litersFilled} onChange={(e) => setLitersFilled(e.target.value)} className="mt-1 w-full p-2 border rounded-md text-gray-900 shadow-sm" />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full p-2 border rounded-md text-gray-900 shadow-sm" placeholder="e.g., Refueled at Shell, delivery details, etc." />
          </div>
          <button type="submit" className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-bold text-base disabled:bg-indigo-300">
            {isEditing ? <PencilIcon className="h-5 w-5"/> : <PlusCircleIcon className="h-5 w-5"/>}
            {isEditing ? "Update Trip Log" : "Submit Trip Log"}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><BookOpenIcon className="h-6 w-6 text-indigo-600"/>Recent Trip History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Odometer</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Liters</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTrips.length > 0 ? recentTrips.map((trip, index) => (
                <tr key={trip.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{trip.trip_date ? new Date(trip.trip_date).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">{trip.opening_km?.toLocaleString()} km</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">{trip.liters_filled ? `${trip.liters_filled.toLocaleString()} L` : '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {index === 0 && isTripEditable(trip.trip_date) && (
                      <button onClick={() => handleEditClick(trip)} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center gap-1 ml-auto">
                        <PencilIcon className="h-4 w-4"/> Edit
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-sm text-gray-500">No recent trips logged.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
