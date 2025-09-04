// src/components/LogRefuel.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { type Database } from '@/types/supabase';
import { BeakerIcon, BookOpenIcon, PlusCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// --- Type Definitions ---
type TruckInfo = { id: number; license_plate: string; make: string | null; model: string | null; active_driver_id: number | null; current_odo: number | null };
type Trip = Database['public']['Tables']['truck_trips']['Row'];
type WorkerInfo = { id: number; fullName: string | null };
type AdminInfo = { id: string; fullName: string | null };
type TripWithDetails = Trip & {
  trucks: { license_plate: string } | null;
  profiles: { full_name: string } | null;
};

// --- Searchable Dropdown Component ---
const SearchableDropdown = ({ items, selectedValue, onSelect, placeholder, disabled = false, }: { items: { id: string | number; label: string }[], selectedValue: string, onSelect: (value: string) => void, placeholder: string, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => items.filter(item => item.label.toLowerCase().includes(searchTerm.toLowerCase())), [items, searchTerm]);
  const selectedItemLabel = items.find(item => item.id.toString() === selectedValue)?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button type="button" onClick={() => !disabled && setIsOpen(!isOpen)} disabled={disabled} className="mt-1 w-full p-2 border rounded-md text-gray-900 bg-white shadow-sm flex justify-between items-center text-left disabled:bg-gray-100 disabled:cursor-not-allowed">
        <span className="truncate">{selectedItemLabel}</span>
        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 sticky top-0 bg-white border-b">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute top-1/2 left-2 -translate-y-1/2" />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-8 p-1.5 border rounded-md text-black" />
            </div>
          </div>
          <ul>
            {filteredItems.map(item => (
              <li key={item.id} onClick={() => { onSelect(item.id.toString()); setIsOpen(false); setSearchTerm(''); }} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900">{item.label}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};


// --- Main Component ---
export default function LogRefuelComponent() {
    const supabase = createClient();
    const { user } = useAuth();
    const [allTrucks, setAllTrucks] = useState<TruckInfo[]>([]);
    const [allWorkers, setAllWorkers] = useState<WorkerInfo[]>([]);
    const [adminUsers, setAdminUsers] = useState<AdminInfo[]>([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
    const [selectedTruckId, setSelectedTruckId] = useState<string>('');
    const [truck, setTruck] = useState<TruckInfo | null>(null);
    const [todaysLog, setTodaysLog] = useState<Trip | null>(null);
    const [globalRecentLogs, setGlobalRecentLogs] = useState<TripWithDetails[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const [odoReading, setOdoReading] = useState('');
    const [lastOdoReading, setLastOdoReading] = useState<number | null>(null);
    const [litersFilled, setLitersFilled] = useState('');
    const [notes, setNotes] = useState('');
    const [route, setRoute] = useState('');
    const [dispensedById, setDispensedById] = useState<string>('');

    const [vehicleRegNoFile, setVehicleRegNoFile] = useState<File | null>(null);
    const [odometerFile, setOdometerFile] = useState<File | null>(null);
    const [fuelPumpFile, setFuelPumpFile] = useState<File | null>(null);

    const isEditing = !!todaysLog;

    const fetchGlobalRecentLogs = useCallback(async () => {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase.from('truck_trips').select(`*, trucks(license_plate), profiles!truck_trips_refueler_profile_id_fkey(full_name)`).gte('created_at', twentyFourHoursAgo).order('created_at', { ascending: false });
        if (error) {
            console.error("Error fetching global refuel history:", error);
            setError("Could not load recent refuel history.");
        } else {
            setGlobalRecentLogs(data as unknown as TripWithDetails[]);
        }
    }, [supabase]);


    const fetchInitialData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const trucksPromise = supabase.from('trucks').select('id, license_plate, make, model, active_driver_id, current_odo').order('license_plate');
            const workersPromise = supabase.from('workers').select('id, profiles(full_name)').order('id');
            const adminsPromise = supabase.from('profiles').select('id, full_name, roles!inner(name)').in('roles.name', ['Admin', 'SuperAdmin']);

            const [trucksResult, workersResult, adminsResult] = await Promise.all([trucksPromise, workersPromise, adminsPromise]);
            if (trucksResult.error) throw new Error("Could not fetch truck list.");
            setAllTrucks(trucksResult.data || []);
            if (workersResult.error) throw new Error("Could not fetch worker list.");
            const formattedWorkers = (workersResult.data || []).map((worker: { id: number; profiles: { full_name: string | null; } | { full_name: string | null; }[] | null; }) => ({ id: worker.id, fullName: (Array.isArray(worker.profiles) ? worker.profiles[0]?.full_name : worker.profiles?.full_name) || `Worker #${worker.id}` }));
            setAllWorkers(formattedWorkers);

            if (adminsResult.error) throw new Error("Could not fetch admin list.");
            setAdminUsers(adminsResult.data.map(a => ({ id: a.id, fullName: a.full_name })));

            await fetchGlobalRecentLogs();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }, [user, supabase, fetchGlobalRecentLogs]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        const fetchLogForSelectedTruck = async () => {
            if (!selectedTruckId) {
                setTodaysLog(null); setOdoReading(''); setLastOdoReading(null); setLitersFilled(''); setNotes(''); setSelectedWorkerId(''); setTruck(null); setRoute(''); setDispensedById('');
                return;
            }
            const selectedTruckData = allTrucks.find(t => t.id.toString() === selectedTruckId) || null;
            setTruck(selectedTruckData);
            if (selectedTruckData?.active_driver_id) { setSelectedWorkerId(selectedTruckData.active_driver_id.toString()); } else { setSelectedWorkerId(''); }
            const { data: logsData, error: logsError } = await supabase.from('truck_trips').select('*').eq('truck_id', selectedTruckId).order('trip_date', { ascending: false }).limit(1);
            if (logsError) { setError(logsError.message); return; }
            const today = new Date().toISOString().slice(0, 10);
            const mostRecentLog = logsData?.[0];
            const lastOdo = mostRecentLog?.opening_km ?? selectedTruckData?.current_odo ?? null;
            setLastOdoReading(lastOdo);
            if (mostRecentLog && mostRecentLog.trip_date === today) {
                setTodaysLog(mostRecentLog); setOdoReading(mostRecentLog.opening_km!.toString()); setLitersFilled(mostRecentLog.liters_filled!.toString()); setNotes(mostRecentLog.notes || ''); setRoute(mostRecentLog.route || ''); setDispensedById(mostRecentLog.dispensed_by_profile_id || '');
            } else {
                setTodaysLog(null); setOdoReading(lastOdo?.toString() || ''); setLitersFilled(''); setNotes(''); setRoute(''); setDispensedById('');
            }
        };
        fetchLogForSelectedTruck();
    }, [selectedTruckId, supabase, allTrucks]);


    const uploadFile = async (file: File | null, bucket: string): Promise<string | null> => {
        if (!file || !truck) return null;

        const filePath = `${truck.id}/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (error) {
            throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
        return publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null); setStatusMessage(null);
        if (!truck || !selectedWorkerId) { setError("Missing truck or driver information."); return; }
        const odoFloat = parseFloat(odoReading);
        const litersFloat = parseFloat(litersFilled);
        if (isNaN(odoFloat) || odoFloat <= 0) { setError("Please enter a valid odometer reading."); return; }
        if (lastOdoReading && odoFloat < lastOdoReading) { setError(`New odometer reading (${odoFloat}) cannot be less than the last reading (${lastOdoReading}).`); return; }
        if (isNaN(litersFloat) || litersFloat <= 0) { setError("Please enter a valid value for liters refueled."); return; }
        setStatusMessage(isEditing ? "Updating trip log..." : "Submitting trip log...");

        try {
            const [vehicleRegNoImageUrl, odometerImageUrl, fuelPumpImageUrl] = await Promise.all([
                uploadFile(vehicleRegNoFile, 'refuel_vehicle_registrations'),
                uploadFile(odometerFile, 'refuel_odometer_readings'),
                uploadFile(fuelPumpFile, 'refuel_fuel_pump_readings'),
            ]);

            const payload: Partial<Trip> = {
                opening_km: odoFloat,
                liters_filled: litersFloat,
                notes,
                truck_id: truck.id,
                worker_id: parseInt(selectedWorkerId),
                route,
                dispensed_by_profile_id: dispensedById || null,
                ...(vehicleRegNoImageUrl && { vehicle_reg_no_image_url: vehicleRegNoImageUrl }),
                ...(odometerImageUrl && { odometer_image_url: odometerImageUrl }),
                ...(fuelPumpImageUrl && { fuel_pump_image_url: fuelPumpImageUrl }),
            };

            if (isEditing && todaysLog) {
                const { error: updateError } = await supabase.from('truck_trips').update(payload).eq('id', todaysLog.id);
                if (updateError) throw updateError;
                setStatusMessage("Log updated successfully!");
            } else {
                const { error: insertError } = await supabase.from('truck_trips').insert({ ...payload, trip_date: new Date().toISOString() } as Trip);
                if (insertError) throw insertError;
                setStatusMessage("Refuel logged successfully!");
            }
            await fetchGlobalRecentLogs();
            const currentTruckId = selectedTruckId; setSelectedTruckId(''); setSelectedTruckId(currentTruckId);
        } catch (err) {
            setError(err instanceof Error ? `Submission failed: ${err.message}` : "An unknown error occurred during submission.");
            setStatusMessage(null);
        }
    };

    const truckItemsForDropdown = useMemo(() => allTrucks.map(t => ({ id: t.id, label: `${t.license_plate} (${t.make} ${t.model})` })), [allTrucks]);
    const workerItemsForDropdown = useMemo(() => allWorkers.map(w => ({ id: w.id, label: w.fullName || `Worker #${w.id}` })), [allWorkers]);
    const adminItemsForDropdown = useMemo(() => adminUsers.map(a => ({ id: a.id, label: a.fullName || `Admin User` })), [adminUsers]);

    if (loading) return <div className="p-4 text-center">Loading...</div>;

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center gap-4 border-b pb-4 mb-4">
                    <div className="flex items-center gap-4">
                        <BeakerIcon className="h-10 w-10 text-indigo-600" />
                        <div><h1 className="text-xl font-bold text-gray-800">{isEditing ? "Edit Today's Log" : "Log New Refuel"}</h1></div>
                    </div>
                </div>

                {statusMessage && <p className="mb-4 text-center text-sm text-green-600 bg-green-50 p-3 rounded-md">{statusMessage}</p>}
                {error && <p className="mb-4 text-center text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label className="block text-sm font-medium text-gray-700">Truck</Label>
                        <SearchableDropdown items={truckItemsForDropdown} selectedValue={selectedTruckId} onSelect={setSelectedTruckId} placeholder="Select a truck to refuel..." />
                    </div>
                    {selectedTruckId && (
                      <>
                        <div>
                            <Label className="block text-sm font-medium text-gray-700">Driver</Label>
                            <SearchableDropdown items={workerItemsForDropdown} selectedValue={selectedWorkerId} onSelect={setSelectedWorkerId} placeholder="Select a driver..." />
                        </div>
                        <div>
                            <Label htmlFor="route" className="block text-sm font-medium text-gray-700">Route</Label>
                            <Input id="route" type="text" value={route} onChange={(e) => setRoute(e.target.value)} className="mt-1 w-full p-2 border rounded-md text-gray-900 shadow-sm bg-white" placeholder="e.g. Local Deliveries" />
                        </div>
                        <div>
                            <Label htmlFor="odo_reading" className="block text-sm font-medium text-gray-700">Current Odometer Reading (km)</Label>
                            <Input id="odo_reading" type="number" value={odoReading} onChange={(e) => setOdoReading(e.target.value)} required className="mt-1 w-full p-2 border rounded-md text-gray-900 shadow-sm bg-white" />
                            {lastOdoReading && <p className="text-xs text-gray-500 mt-1">Last reading: {lastOdoReading.toLocaleString()} km</p>}
                        </div>
                        <div>
                            <Label htmlFor="liters_filled" className="block text-sm font-medium text-gray-700">Liters Refueled</Label>
                            <Input id="liters_filled" type="number" step="0.01" placeholder="0.00" value={litersFilled} onChange={(e) => setLitersFilled(e.target.value)} required className="mt-1 w-full p-2 border rounded-md text-gray-900 shadow-sm bg-white" />
                        </div>
                        <div>
                            <Label className="block text-sm font-medium text-gray-700">Dispensed By</Label>
                            <SearchableDropdown items={adminItemsForDropdown} selectedValue={dispensedById} onSelect={setDispensedById} placeholder="Select dispenser..." />
                        </div>
                        <div>
                            <Label htmlFor="vehicle_reg_no_image" className="block text-sm font-medium text-gray-700">Vehicle Registration Photo</Label>
                            <Input id="vehicle_reg_no_image" type="file" onChange={(e) => setVehicleRegNoFile(e.target.files?.[0] || null)} className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                        </div>
                        <div>
                            <Label htmlFor="odometer_image" className="block text-sm font-medium text-gray-700">Odometer Photo</Label>
                            <Input id="odometer_image" type="file" onChange={(e) => setOdometerFile(e.target.files?.[0] || null)} className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                        </div>
                        <div>
                            <Label htmlFor="fuel_pump_image" className="block text-sm font-medium text-gray-700">Fuel Pump Photo</Label>
                            <Input id="fuel_pump_image" type="file" onChange={(e) => setFuelPumpFile(e.target.files?.[0] || null)} className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                        </div>

                        <div>
                            <Label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</Label>
                            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full p-2 border rounded-md text-gray-900 shadow-sm" placeholder="e.g., Refueled at Shell, etc." />
                        </div>
                        <button type="submit" className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-bold text-base disabled:bg-indigo-300">
                            {isEditing ? <PencilIcon className="h-5 w-5"/> : <PlusCircleIcon className="h-5 w-5"/>}
                            {isEditing ? "Update Refuel Log" : "Submit Refuel Log"}
                        </button>
                      </>
                    )}
                </form>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><BookOpenIcon className="h-6 w-6 text-indigo-600"/>Recent Refuel History (Last 24 Hours)</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Truck</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Refueler</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Liters</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {globalRecentLogs.length > 0 ? globalRecentLogs.map(log => (
                                <tr key={log.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{log.trucks?.license_plate || 'N/A'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.profiles?.full_name || 'N/A'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">{log.liters_filled!.toLocaleString()} L</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-4 text-sm text-gray-500">No refuels logged in the last 24 hours.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}