// src/app/(shell)/worker/pre-trip-check/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { TruckIcon, ShieldCheckIcon, ExclamationTriangleIcon, LightBulbIcon, SunIcon, CogIcon, BeakerIcon, CloudIcon, ViewfinderCircleIcon } from '@heroicons/react/24/outline';

// --- Type Definitions ---
type TruckInfo = { id: number; license_plate: string; make: string | null; model: string | null; };
type WorkerInfo = { id: number; };
type TireState = Record<string, boolean>;
type CheckState = {
  windshield_ok: boolean;
  driver_window_ok: boolean;
  passenger_window_ok: boolean;
  driver_mirror_ok: boolean;
  passenger_mirror_ok: boolean;
  center_mirror_ok: boolean;
  lights_ok: boolean;
  oil_level_ok: boolean;
  water_level_ok: boolean;
  tires_ok: TireState;
  other_issues: string;
};

// --- Default State for a standard 6-wheel truck ---
const defaultTireState: TireState = {
  'Front Left': true, 'Front Right': true,
  'Rear Left Inner': true, 'Rear Left Outer': true,
  'Rear Right Inner': true, 'Rear Right Outer': true,
};

const defaultCheckState: CheckState = {
  windshield_ok: true, driver_window_ok: true, passenger_window_ok: true,
  driver_mirror_ok: true, passenger_mirror_ok: true, center_mirror_ok: true,
  lights_ok: true, oil_level_ok: true, water_level_ok: true,
  tires_ok: defaultTireState, other_issues: '',
};

// --- Main Page Component ---
export default function PreTripCheckPage() {
  const supabase = createClient();
  const { user } = useAuth();

  const [truck, setTruck] = useState<TruckInfo | null>(null);
  const [worker, setWorker] = useState<WorkerInfo | null>(null);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [checkState, setCheckState] = useState<CheckState>(defaultCheckState);

  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data: workerData, error: workerError } = await supabase.from('workers').select('id').eq('profile_id', user.id).single();
      if (workerError || !workerData) throw new Error("Could not find your worker profile.");
      setWorker(workerData);

      const { data: truckData, error: truckError } = await supabase.from('trucks').select('id, license_plate, make, model').eq('assigned_worker_id', workerData.id).single();
      if (truckError || !truckData) throw new Error("You are not assigned to a truck.");
      setTruck(truckData);

      const today = new Date().toISOString().slice(0, 10);
      const { data: todayCheck } = await supabase.from('pre_trip_checks').select('id').eq('truck_id', truckData.id).gte('checked_at', `${today}T00:00:00Z`).limit(1);
      if (todayCheck && todayCheck.length > 0) {
        setHasSubmittedToday(true);
      } else {
        const { data: lastCheck } = await supabase.from('pre_trip_checks').select('*').eq('truck_id', truckData.id).order('checked_at', { ascending: false }).limit(1).single();
        if (lastCheck) {
          setCheckState({
            ...defaultCheckState,
            ...lastCheck,
            tires_ok: (lastCheck.tires_ok as TireState) || defaultTireState,
            other_issues: '', // Clear previous comments
          });
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while fetching data.");
      }
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleToggle = (field: keyof Omit<CheckState, 'tires_ok' | 'other_issues'>) => {
    setCheckState(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleTireToggle = (tireName: string) => {
    setCheckState(prev => ({
      ...prev,
      tires_ok: { ...prev.tires_ok, [tireName]: !prev.tires_ok[tireName] }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!truck || !worker) {
      setError("Cannot submit: Missing truck or worker information.");
      return;
    }
    setStatusMessage("Submitting your checklist...");
    setError(null);

    const { error: insertError } = await supabase.from('pre_trip_checks').insert({ truck_id: truck.id, worker_id: worker.id, ...checkState });
    if (insertError) {
      setError(`Submission failed: ${insertError.message}`);
      setStatusMessage(null);
    } else {
      setStatusMessage("Checklist submitted successfully!");
      setHasSubmittedToday(true);
    }
  };

  if (loading) return <div className="p-6 text-center font-semibold">Loading your details...</div>;
  if (error) return <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto text-center text-red-600"><ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4" /><h2 className="text-xl font-bold">An Error Occurred</h2><p>{error}</p></div>;
  if (hasSubmittedToday) return <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto text-center text-green-600"><ShieldCheckIcon className="h-12 w-12 mx-auto mb-4" /><h2 className="text-xl font-bold">Checklist Submitted</h2><p>You have already submitted the pre-trip check for <strong>{truck?.license_plate}</strong> today. Thank you!</p></div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center border-b pb-4 mb-6">
          <TruckIcon className="h-10 w-10 mx-auto text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Pre-Trip Vehicle Check</h1>
          <p className="text-gray-600">For Truck: <strong>{truck?.make} {truck?.model} - {truck?.license_plate}</strong></p>
        </div>

        {statusMessage && !error && <p className="text-blue-600 mb-4 text-center">{statusMessage}</p>}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Left Column */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-bold text-lg text-center text-gray-700">Driver Side</h3>
              <ChecklistItem icon={SunIcon} label="Driver Window" value={checkState.driver_window_ok} onToggle={() => handleToggle('driver_window_ok')} />
              <ChecklistItem icon={ViewfinderCircleIcon} label="Driver Mirror" value={checkState.driver_mirror_ok} onToggle={() => handleToggle('driver_mirror_ok')} />
              <TireCheckItem label="Front Left" value={checkState.tires_ok['Front Left']} onToggle={() => handleTireToggle('Front Left')} />
              <TireCheckItem label="Rear Left Inner" value={checkState.tires_ok['Rear Left Inner']} onToggle={() => handleTireToggle('Rear Left Inner')} />
              <TireCheckItem label="Rear Left Outer" value={checkState.tires_ok['Rear Left Outer']} onToggle={() => handleTireToggle('Rear Left Outer')} />
            </div>

            {/* Center Column */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-bold text-lg text-center text-gray-700">Center & Engine</h3>
              <ChecklistItem icon={SunIcon} label="Windshield" value={checkState.windshield_ok} onToggle={() => handleToggle('windshield_ok')} />
              <ChecklistItem icon={ViewfinderCircleIcon} label="Center Mirror" value={checkState.center_mirror_ok} onToggle={() => handleToggle('center_mirror_ok')} />
              <ChecklistItem icon={LightBulbIcon} label="Lights & Indicators" value={checkState.lights_ok} onToggle={() => handleToggle('lights_ok')} />
              <ChecklistItem icon={BeakerIcon} label="Oil Level" value={checkState.oil_level_ok} onToggle={() => handleToggle('oil_level_ok')} />
              <ChecklistItem icon={CloudIcon} label="Water / Coolant" value={checkState.water_level_ok} onToggle={() => handleToggle('water_level_ok')} />
            </div>

            {/* Right Column */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-bold text-lg text-center text-gray-700">Passenger Side</h3>
              <ChecklistItem icon={SunIcon} label="Passenger Window" value={checkState.passenger_window_ok} onToggle={() => handleToggle('passenger_window_ok')} />
              <ChecklistItem icon={ViewfinderCircleIcon} label="Passenger Mirror" value={checkState.passenger_mirror_ok} onToggle={() => handleToggle('passenger_mirror_ok')} />
              <TireCheckItem label="Front Right" value={checkState.tires_ok['Front Right']} onToggle={() => handleTireToggle('Front Right')} />
              <TireCheckItem label="Rear Right Inner" value={checkState.tires_ok['Rear Right Inner']} onToggle={() => handleTireToggle('Rear Right Inner')} />
              <TireCheckItem label="Rear Right Outer" value={checkState.tires_ok['Rear Right Outer']} onToggle={() => handleTireToggle('Rear Right Outer')} />
            </div>
          </div>

          <div>
            <label htmlFor="other_issues" className="block text-sm font-medium text-gray-700 mb-1">Other Issues or Comments</label>
            <textarea id="other_issues" value={checkState.other_issues} onChange={(e) => setCheckState(p => ({ ...p, other_issues: e.target.value }))} rows={3} className="w-full p-2 border rounded-md text-gray-900 placeholder-gray-500 shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="Report any other issues here..."/>
          </div>

          <button type="submit" className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-bold text-lg disabled:bg-indigo-300">Submit Daily Check</button>
        </form>
      </div>
    </div>
  );
}

// --- Sub-components for Checklist Items ---
const ChecklistItem = ({ icon: Icon, label, value, onToggle }: { icon: React.ElementType; label: string; value: boolean; onToggle: () => void; }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      <Icon className={`h-6 w-6 mr-3 ${value ? 'text-gray-500' : 'text-red-500'}`} />
      <span className={`font-semibold ${value ? 'text-gray-800' : 'text-red-600'}`}>{label}</span>
    </div>
    <ToggleSwitch value={value} onToggle={onToggle} />
  </div>
);

const TireCheckItem = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void; }) => (
  <ChecklistItem icon={CogIcon} label={label} value={value} onToggle={onToggle} />
);

const ToggleSwitch = ({ value, onToggle }: { value: boolean; onToggle: () => void; }) => (
  <button type="button" onClick={onToggle} className={`${value ? 'bg-green-500' : 'bg-gray-300'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}>
    <span className={`${value ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
  </button>
);
