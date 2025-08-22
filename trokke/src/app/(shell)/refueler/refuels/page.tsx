// src/app/(shell)/refueler/refuels/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { type Database } from '@/types/supabase';
import { PlusCircleIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';

// --- Type Definitions ---
type Truck = Pick<Database['public']['Tables']['trucks']['Row'], 'id' | 'license_plate'>;
type Refueler = { id: number };
type RefuelLog = Database['public']['Tables']['refueler_logs']['Row'] & {
    trucks: { license_plate: string } | null;
};

// --- Searchable Dropdown Component ---
const SearchableDropdown = ({
  items,
  selectedValue,
  onSelect,
  placeholder,
}: {
  items: { id: number; label: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() =>
    items.filter(item =>
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    ), [items, searchTerm]);

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
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="mt-1 w-full p-2 border rounded-md text-gray-900 bg-white shadow-sm flex justify-between items-center text-left"
      >
        <span className="truncate">{selectedItemLabel}</span>
        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 sticky top-0 bg-white border-b">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute top-1/2 left-2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 p-1.5 border rounded-md text-black"
              />
            </div>
          </div>
          <ul>
            {filteredItems.map(item => (
              <li
                key={item.id}
                onClick={() => {
                  onSelect(item.id.toString());
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900"
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};


// --- Main Page Component ---
export default function LogRefuelPage() {
  const supabase = createClient();
  const { user } = useAuth();

  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [refueler, setRefueler] = useState<Refueler | null>(null);
  const [recentLogs, setRecentLogs] = useState<RefuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form state
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [odoReading, setOdoReading] = useState('');
  const [litersFilled, setLitersFilled] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
        // Get Refueler ID
        const { data: refuelerData, error: refuelerError } = await supabase
            .from('refuelers')
            .select('id')
            .eq('profile_id', user.id)
            .single();
        if (refuelerError || !refuelerData) throw new Error("Could not find your refueler profile.");
        setRefueler(refuelerData);

        // Get all trucks
        const { data: trucksData, error: trucksError } = await supabase
            .from('trucks')
            .select('id, license_plate')
            .order('license_plate');
        if (trucksError) throw new Error("Could not fetch truck list.");
        setTrucks(trucksData || []);

        // Get recent logs for this refueler
        const { data: logsData, error: logsError } = await supabase
            .from('refueler_logs')
            .select('*, trucks(license_plate)')
            .eq('refueler_id', refuelerData.id)
            .order('refuel_date', { ascending: false })
            .limit(5);
        if (logsError) throw new Error("Could not fetch recent logs.");
        setRecentLogs(logsData as RefuelLog[] || []);

    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refueler) {
        setError("Refueler profile not found.");
        return;
    }
    setStatusMessage("Submitting log...");
    setError(null);

    const { error: insertError } = await supabase.from('refueler_logs').insert({
      refueler_id: refueler.id,
      truck_id: parseInt(selectedTruckId),
      odo_reading: parseFloat(odoReading),
      liters_filled: parseFloat(litersFilled),
      notes: notes,
    });

    if (insertError) {
      setError(`Submission failed: ${insertError.message}`);
      setStatusMessage(null);
    } else {
      setStatusMessage("Refuel logged successfully!");
      // Clear form
      setSelectedTruckId('');
      setOdoReading('');
      setLitersFilled('');
      setNotes('');
      fetchData(); // Refresh recent logs
    }
  };
  
  const truckItemsForDropdown = useMemo(() => 
      trucks.map(truck => ({ id: truck.id, label: truck.license_plate })),
  [trucks]);

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Log a Refuel</h1>
        
        {statusMessage && <p className="mb-4 text-center text-sm text-green-600">{statusMessage}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="truck_id" className="block text-sm font-medium text-gray-700">Truck</label>
                <SearchableDropdown
                    items={truckItemsForDropdown}
                    selectedValue={selectedTruckId}
                    onSelect={setSelectedTruckId}
                    placeholder="Select a truck..."
                />
            </div>
          <div>
            <label htmlFor="odo_reading" className="block text-sm font-medium text-gray-700">Odometer Reading (km)</label>
            <input id="odo_reading" type="number" value={odoReading} onChange={(e) => setOdoReading(e.target.value)} required className="mt-1 w-full p-2 border rounded-md text-gray-900 shadow-sm" />
          </div>
          <div>
            <label htmlFor="liters_filled" className="block text-sm font-medium text-gray-700">Liters Refueled</label>
            <input id="liters_filled" type="number" step="0.01" value={litersFilled} onChange={(e) => setLitersFilled(e.target.value)} required className="mt-1 w-full p-2 border rounded-md text-gray-900 shadow-sm" />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full p-2 border rounded-md text-gray-900 shadow-sm" />
          </div>
          <button type="submit" className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-bold text-base">
            <PlusCircleIcon className="h-5 w-5"/> Submit Log
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><BookOpenIcon className="h-6 w-6 text-indigo-600"/>Your Recent Logs</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Truck</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Liters</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentLogs.map(log => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-sm text-gray-800">{new Date(log.refuel_date).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.trucks?.license_plate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{log.liters_filled} L</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
