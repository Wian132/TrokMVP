// src/components/LogRefuel.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { type Database } from '@/types/supabase';
import { BeakerIcon, BookOpenIcon, PlusCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// --- Type Definitions ---
type TruckInfo = { id: number; license_plate: string; make: string | null; model: string | null; active_driver_id: number | null; current_odo: number | null };
type RefuelLog = Database['public']['Tables']['refueler_logs']['Row'];
type WorkerInfo = { id: number; fullName: string | null };
type DieselPurchase = Database['public']['Tables']['diesel_purchases']['Row'];
type RefuelLogWithDetails = RefuelLog & {
  trucks: { license_plate: string } | null;
  profiles: { full_name: string } | null;
};
type ProfileWithRole = {
    roles: { name: string } | { name: string }[] | null;
};

// --- Add Diesel Purchase Modal Component ---
interface AddDieselPurchaseModalProps {
  onPurchaseAdded: (newPurchase: DieselPurchase) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddDieselPurchaseModal({ onPurchaseAdded, isOpen, onOpenChange }: AddDieselPurchaseModalProps) {
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [newPurchase, setNewPurchase] = useState({
    liters: '',
    price_per_liter: '',
    purchase_date: new Date().toISOString().split('T')[0],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPurchase((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreatePurchase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const liters = parseFloat(newPurchase.liters);
    const price_per_liter = parseFloat(newPurchase.price_per_liter);

    if (isNaN(liters) || liters <= 0) {
      setError('Please enter a valid number of liters.');
      return;
    }
    if (isNaN(price_per_liter) || price_per_liter <= 0) {
      setError('Please enter a valid price per liter.');
      return;
    }

    const { data, error: insertError } = await supabase
      .from('diesel_purchases')
      .insert({ liters, price_per_liter, purchase_date: newPurchase.purchase_date })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      onPurchaseAdded(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle>Add New Diesel Purchase</DialogTitle>
          <DialogDescription>Log a new bulk diesel purchase that can be used for refueling.</DialogDescription>
        </DialogHeader>
        {error && <p className="text-red-600 bg-red-100 p-3 rounded-md my-2">{error}</p>}
        <form onSubmit={handleCreatePurchase} className="space-y-4 pt-4">
          <div>
            <Label htmlFor="purchase_date">Purchase Date</Label>
            <Input id="purchase_date" type="date" name="purchase_date" value={newPurchase.purchase_date} onChange={handleInputChange} required className="bg-white" />
          </div>
          <div>
            <Label htmlFor="liters">Total Liters</Label>
            <Input id="liters" type="number" name="liters" placeholder="e.g., 5000" value={newPurchase.liters} onChange={handleInputChange} required className="bg-white" />
          </div>
          <div>
            <Label htmlFor="price_per_liter">Price Per Liter (R)</Label>
            <Input id="price_per_liter" type="number" name="price_per_liter" placeholder="e.g., 21.50" step="0.01" value={newPurchase.price_per_liter} onChange={handleInputChange} required className="bg-white" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              <PlusCircleIcon className="mr-2 h-4 w-4" /> Save Purchase
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


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
    const [userRole, setUserRole] = useState<string | null>(null);
    const [allTrucks, setAllTrucks] = useState<TruckInfo[]>([]);
    const [allWorkers, setAllWorkers] = useState<WorkerInfo[]>([]);
    const [dieselPurchases, setDieselPurchases] = useState<DieselPurchase[]>([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
    const [selectedTruckId, setSelectedTruckId] = useState<string>('');
    const [selectedTankId, setSelectedTankId] = useState<string>('');
    const [truck, setTruck] = useState<TruckInfo | null>(null);
    const [todaysLog, setTodaysLog] = useState<RefuelLog | null>(null);
    const [globalRecentLogs, setGlobalRecentLogs] = useState<RefuelLogWithDetails[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const [odoReading, setOdoReading] = useState('');
    const [lastOdoReading, setLastOdoReading] = useState<number | null>(null);
    const [litersFilled, setLitersFilled] = useState('');
    const [notes, setNotes] = useState('');

    const [isAddPurchaseModalOpen, setIsAddPurchaseModalOpen] = useState(false);
    const isEditing = !!todaysLog;

    const fetchGlobalRecentLogs = useCallback(async () => {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase.from('refueler_logs').select(`*, trucks(license_plate), profiles!refueler_logs_refueler_profile_id_fkey(full_name)`).gte('refuel_date', twentyFourHoursAgo).order('refuel_date', { ascending: false });
        if (error) {
            console.error("Error fetching global refuel history:", error);
            setError("Could not load recent refuel history.");
        } else {
            setGlobalRecentLogs(data as unknown as RefuelLogWithDetails[]);
        }
    }, [supabase]);

    const fetchDieselPurchases = useCallback(async () => {
        const { data, error } = await supabase.from('diesel_purchases').select('*').order('purchase_date', { ascending: false }).limit(20);
        if (error) throw new Error("Could not fetch diesel purchases.");
        setDieselPurchases(data || []);
        return data || [];
    }, [supabase]);

    const fetchInitialData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: profileData, error: profileError } = await supabase.from('profiles').select('roles(name)').eq('id', user.id).single();
            if (profileError) throw new Error("Could not fetch user profile.");
            
            const typedProfile = profileData as ProfileWithRole;
            const roleRelation = typedProfile.roles;
            const roleName = Array.isArray(roleRelation) ? roleRelation[0]?.name : roleRelation?.name;
            setUserRole(roleName || null);

            const trucksPromise = supabase.from('trucks').select('id, license_plate, make, model, active_driver_id, current_odo').order('license_plate');
            const workersPromise = supabase.from('workers').select('id, profiles(full_name)').order('id');
            const [trucksResult, workersResult] = await Promise.all([trucksPromise, workersPromise]);
            if (trucksResult.error) throw new Error("Could not fetch truck list.");
            setAllTrucks(trucksResult.data || []);
            if (workersResult.error) throw new Error("Could not fetch worker list.");
            const formattedWorkers = (workersResult.data || []).map((worker: { id: number; profiles: { full_name: string | null; } | { full_name: string | null; }[] | null; }) => ({ id: worker.id, fullName: (Array.isArray(worker.profiles) ? worker.profiles[0]?.full_name : worker.profiles?.full_name) || `Worker #${worker.id}` }));
            setAllWorkers(formattedWorkers);
            await fetchDieselPurchases();
            await fetchGlobalRecentLogs();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }, [user, supabase, fetchGlobalRecentLogs, fetchDieselPurchases]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        const fetchLogForSelectedTruck = async () => {
            if (!selectedTruckId) {
                setTodaysLog(null); setOdoReading(''); setLastOdoReading(null); setLitersFilled(''); setNotes(''); setSelectedWorkerId(''); setSelectedTankId(''); setTruck(null);
                return;
            }
            const selectedTruckData = allTrucks.find(t => t.id.toString() === selectedTruckId) || null;
            setTruck(selectedTruckData);
            if (selectedTruckData?.active_driver_id) { setSelectedWorkerId(selectedTruckData.active_driver_id.toString()); } else { setSelectedWorkerId(''); }
            const { data: logsData, error: logsError } = await supabase.from('refueler_logs').select('*').eq('truck_id', selectedTruckId).order('refuel_date', { ascending: false }).limit(1);
            if (logsError) { setError(logsError.message); return; }
            const today = new Date().toISOString().slice(0, 10);
            const mostRecentLog = logsData?.[0];
            const lastOdo = mostRecentLog?.odo_reading ?? selectedTruckData?.current_odo ?? null;
            setLastOdoReading(lastOdo);
            if (mostRecentLog && mostRecentLog.refuel_date === today) {
                setTodaysLog(mostRecentLog); setOdoReading(mostRecentLog.odo_reading.toString()); setLitersFilled(mostRecentLog.liters_filled.toString()); setSelectedTankId(mostRecentLog.tank_id?.toString() || ''); setNotes(mostRecentLog.notes || '');
            } else {
                setTodaysLog(null); setOdoReading(lastOdo?.toString() || ''); setLitersFilled(''); setSelectedTankId(''); setNotes('');
            }
        };
        fetchLogForSelectedTruck();
    }, [selectedTruckId, supabase, allTrucks]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null); setStatusMessage(null);
        if (!truck || !selectedWorkerId) { setError("Missing truck or driver information."); return; }
        const odoFloat = parseFloat(odoReading);
        const litersFloat = parseFloat(litersFilled);
        if (isNaN(odoFloat) || odoFloat <= 0) { setError("Please enter a valid odometer reading."); return; }
        if (lastOdoReading && odoFloat < lastOdoReading) { setError(`New odometer reading (${odoFloat}) cannot be less than the last reading (${lastOdoReading}).`); return; }
        if (isNaN(litersFloat) || litersFloat <= 0) { setError("Please enter a valid value for liters refueled."); return; }
        setStatusMessage(isEditing ? "Updating refuel log..." : "Submitting refuel log...");
        const payload = { odo_reading: odoFloat, liters_filled: litersFloat, notes, truck_id: truck.id, worker_id: parseInt(selectedWorkerId), tank_id: selectedTankId ? parseInt(selectedTankId) : null, };
        if (isEditing && todaysLog) {
            const { error: updateError } = await supabase.from('refueler_logs').update(payload).eq('id', todaysLog.id);
            if (updateError) setError(`Update failed: ${updateError.message}`); else setStatusMessage("Log updated successfully!");
        } else {
            const { error: insertError } = await supabase.from('refueler_logs').insert(payload);
            if (insertError) setError(`Submission failed: ${insertError.message}`); else setStatusMessage("Refuel logged successfully!");
        }
        await fetchGlobalRecentLogs();
        const currentTruckId = selectedTruckId; setSelectedTruckId(''); setSelectedTruckId(currentTruckId);
    };

    const handlePurchaseAdded = async (newPurchase: DieselPurchase) => {
        const updatedPurchases = await fetchDieselPurchases();
        setDieselPurchases(updatedPurchases);
        setSelectedTankId(newPurchase.id.toString());
        setIsAddPurchaseModalOpen(false);
        setStatusMessage("New diesel batch added and selected.");
    };
    
    const isAdmin = userRole === 'SuperAdmin' || userRole === 'Admin';
    const truckItemsForDropdown = useMemo(() => allTrucks.map(t => ({ id: t.id, label: `${t.license_plate} (${t.make} ${t.model})` })), [allTrucks]);
    const workerItemsForDropdown = useMemo(() => allWorkers.map(w => ({ id: w.id, label: w.fullName || `Worker #${w.id}` })), [allWorkers]);
    const dieselBatchItemsForDropdown = useMemo(() => dieselPurchases.map(p => ({ id: p.id, label: `${new Date(p.purchase_date).toLocaleDateString()} - R${p.price_per_liter}/L (${p.liters}L)` })), [dieselPurchases]);

    if (loading) return <div className="p-4 text-center">Loading...</div>;
    
    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
            <AddDieselPurchaseModal isOpen={isAddPurchaseModalOpen} onOpenChange={setIsAddPurchaseModalOpen} onPurchaseAdded={handlePurchaseAdded} />
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center gap-4 border-b pb-4 mb-4">
                    <div className="flex items-center gap-4">
                        <BeakerIcon className="h-10 w-10 text-indigo-600" />
                        <div><h1 className="text-xl font-bold text-gray-800">{isEditing ? "Edit Today's Log" : "Log New Refuel"}</h1></div>
                    </div>
                    {isAdmin && (
                        <Button type="button" onClick={() => setIsAddPurchaseModalOpen(true)} className="bg-green-600 hover:bg-green-700">
                            <PlusCircleIcon className="mr-2 h-4 w-4" /> Add New Batch
                        </Button>
                    )}
                </div>

                {statusMessage && <p className="mb-4 text-center text-sm text-green-600 bg-green-50 p-3 rounded-md">{statusMessage}</p>}
                {error && <p className="mb-4 text-center text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Truck</label>
                        <SearchableDropdown items={truckItemsForDropdown} selectedValue={selectedTruckId} onSelect={setSelectedTruckId} placeholder="Select a truck to refuel..." />
                    </div>
                    {selectedTruckId && (
                      <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Driver</label>
                            <SearchableDropdown items={workerItemsForDropdown} selectedValue={selectedWorkerId} onSelect={setSelectedWorkerId} placeholder="Select a driver..." />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Diesel Batch</label>
                          <SearchableDropdown items={dieselBatchItemsForDropdown} selectedValue={selectedTankId} onSelect={setSelectedTankId} placeholder="Select diesel purchase..." />
                        </div>
                        <div>
                            <label htmlFor="odo_reading" className="block text-sm font-medium text-gray-700">Current Odometer Reading (km)</label>
                            <input id="odo_reading" type="number" value={odoReading} onChange={(e) => setOdoReading(e.target.value)} required className="mt-1 w-full p-2 border rounded-md text-gray-900 shadow-sm" />
                            {lastOdoReading && <p className="text-xs text-gray-500 mt-1">Last reading: {lastOdoReading.toLocaleString()} km</p>}
                        </div>
                        <div>
                            <label htmlFor="liters_filled" className="block text-sm font-medium text-gray-700">Liters Refueled</label>
                            <input id="liters_filled" type="number" step="0.01" placeholder="0.00" value={litersFilled} onChange={(e) => setLitersFilled(e.target.value)} required className="mt-1 w-full p-2 border rounded-md text-gray-900 shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
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
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{new Date(log.refuel_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{log.trucks?.license_plate || 'N/A'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.profiles?.full_name || 'N/A'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">{log.liters_filled.toLocaleString()} L</td>
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