// src/app/(shell)/worker/pre-trip-check/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { TruckIcon, ShieldCheckIcon, ExclamationTriangleIcon, LightBulbIcon, SunIcon, CogIcon, BeakerIcon, CloudIcon, ViewfinderCircleIcon, SpeakerWaveIcon, StopCircleIcon, FireIcon } from '@heroicons/react/24/outline';

// --- Type Definitions ---
type TruckInfo = { id: number; license_plate: string; make: string | null; model: string | null; };
type WorkerInfo = { id: number; };
type TireState = {
  driver_side_ok: boolean;
  passenger_side_ok: boolean;
};
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
  hooter_ok: boolean;
  brakes_ok: boolean;
  fridge_ok: boolean;
  tires_ok: TireState;
  other_issues: string;
};

// --- Default State ---
const defaultTireState: TireState = {
  driver_side_ok: true,
  passenger_side_ok: true,
};
const defaultCheckState: CheckState = {
  windshield_ok: true, driver_window_ok: true, passenger_window_ok: true,
  driver_mirror_ok: true, passenger_mirror_ok: true, center_mirror_ok: true,
  lights_ok: true, oil_level_ok: true, water_level_ok: true,
  hooter_ok: true, brakes_ok: true, fridge_ok: true,
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
        // This logic correctly fetches the last check to pre-populate the form
        const { data: lastCheck } = await supabase.from('pre_trip_checks').select('*').eq('truck_id', truckData.id).order('checked_at', { ascending: false }).limit(1).single();
        if (lastCheck) {
          setCheckState({
            ...defaultCheckState,
            ...lastCheck,
            tires_ok: (lastCheck.tires_ok as TireState) || defaultTireState,
            // UPDATED: Now carries over previous issues
            other_issues: lastCheck.other_issues || '', 
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

  const handleTireToggle = (side: keyof TireState) => {
    setCheckState(prev => ({
      ...prev,
      tires_ok: { ...prev.tires_ok, [side]: !prev.tires_ok[side] }
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

    // This correctly INSERTS a new row into the database on every submission.
    const { error: insertError } = await supabase.from('pre_trip_checks').insert({
      truck_id: truck.id,
      worker_id: worker.id,
      ...checkState
    });

    if (insertError) {
      setError(`Submission failed: ${insertError.message}`);
      setStatusMessage(null);
    } else {
      setStatusMessage("Checklist submitted successfully!");
      setHasSubmittedToday(true);
    }
  };


  if (loading) return <div className="p-4 text-center font-semibold">Loading your details...</div>;
  if (error) return <div className="p-4 bg-white rounded-lg shadow-md max-w-md mx-auto text-center text-red-600"><ExclamationTriangleIcon className="h-10 w-10 mx-auto mb-3" /><h2 className="text-lg font-bold">An Error Occurred</h2><p className="text-sm">{error}</p></div>;
  if (hasSubmittedToday) return <div className="p-4 bg-white rounded-lg shadow-md max-w-md mx-auto text-center text-green-600"><ShieldCheckIcon className="h-10 w-10 mx-auto mb-3" /><h2 className="text-lg font-bold">Checklist Submitted</h2><p className="text-sm">You have already submitted the pre-trip check for <strong>{truck?.license_plate}</strong> today. Thank you!</p></div>;

  return (
    <div className="p-2 sm:p-4 max-w-md mx-auto">
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="text-center border-b pb-3 mb-4">
          <TruckIcon className="h-8 w-8 mx-auto text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-800 mt-1">Pre-Trip Vehicle Check</h1>
          <p className="text-sm text-gray-600">For: <strong>{truck?.make} {truck?.model} - {truck?.license_plate}</strong></p>
        </div>

        {statusMessage && !error && <p className="text-blue-600 mb-4 text-center text-sm">{statusMessage}</p>}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <CheckSection title="Driver Side">
                <ChecklistItem icon={SunIcon} label="Window" value={checkState.driver_window_ok} onToggle={() => handleToggle('driver_window_ok')} />
                <ChecklistItem icon={ViewfinderCircleIcon} label="Mirror" value={checkState.driver_mirror_ok} onToggle={() => handleToggle('driver_mirror_ok')} />
                <ChecklistItem icon={CogIcon} label="Tires" value={checkState.tires_ok.driver_side_ok} onToggle={() => handleTireToggle('driver_side_ok')} />
              </CheckSection>
              
              <CheckSection title="Passenger Side">
                <ChecklistItem icon={SunIcon} label="Window" value={checkState.passenger_window_ok} onToggle={() => handleToggle('passenger_window_ok')} />
                <ChecklistItem icon={ViewfinderCircleIcon} label="Mirror" value={checkState.passenger_mirror_ok} onToggle={() => handleToggle('passenger_mirror_ok')} />
                <ChecklistItem icon={CogIcon} label="Tires" value={checkState.tires_ok.passenger_side_ok} onToggle={() => handleTireToggle('passenger_side_ok')} />
              </CheckSection>
            </div>

            <CheckSection title="Systems Check">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <ChecklistItem icon={SunIcon} label="Windshield" value={checkState.windshield_ok} onToggle={() => handleToggle('windshield_ok')} />
                    <ChecklistItem icon={ViewfinderCircleIcon} label="Center Mirror" value={checkState.center_mirror_ok} onToggle={() => handleToggle('center_mirror_ok')} />
                    <ChecklistItem icon={LightBulbIcon} label="Lights" value={checkState.lights_ok} onToggle={() => handleToggle('lights_ok')} />
                    <ChecklistItem icon={SpeakerWaveIcon} label="Hooter" value={checkState.hooter_ok} onToggle={() => handleToggle('hooter_ok')} />
                    <ChecklistItem icon={StopCircleIcon} label="Brakes" value={checkState.brakes_ok} onToggle={() => handleToggle('brakes_ok')} />
                    <ChecklistItem icon={FireIcon} label="Fridge Unit" value={checkState.fridge_ok} onToggle={() => handleToggle('fridge_ok')} />
                    <ChecklistItem icon={BeakerIcon} label="Oil Level" value={checkState.oil_level_ok} onToggle={() => handleToggle('oil_level_ok')} />
                    <ChecklistItem icon={CloudIcon} label="Coolant" value={checkState.water_level_ok} onToggle={() => handleToggle('water_level_ok')} />
                </div>
            </CheckSection>
          </div>

          <div className="mt-4">
            <label htmlFor="other_issues" className="block text-xs font-medium text-gray-700 mb-1">Other Issues or Comments</label>
            <textarea id="other_issues" value={checkState.other_issues} onChange={(e) => setCheckState(p => ({ ...p, other_issues: e.target.value }))} rows={2} className="w-full p-2 border rounded-md text-gray-900 text-sm placeholder-gray-500 shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="If any item is not OK, please describe the issue here..."/>
          </div>

          <button type="submit" className="w-full mt-4 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-bold text-base disabled:bg-indigo-300">Submit Daily Check</button>
        </form>
      </div>
    </div>
  );
}

// --- Sub-components for Checklist Items ---
const CheckSection = ({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) => (
    <div className={`space-y-2 p-2 bg-gray-50 rounded-lg border ${className}`}>
        <h3 className="font-bold text-sm text-center text-gray-700">{title}</h3>
        {children}
    </div>
);

const ChecklistItem = ({ icon: Icon, label, value, onToggle }: { icon: React.ElementType; label: string; value: boolean; onToggle: () => void; }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center min-w-0 mr-2">
      <Icon className={`h-4 w-4 mr-1.5 flex-shrink-0 ${value ? 'text-gray-500' : 'text-red-500'}`} />
      <span className={`font-semibold text-xs ${value ? 'text-gray-800' : 'text-red-600'}`}>{label}</span>
    </div>
    <ToggleSwitch value={value} onToggle={onToggle} />
  </div>
);

const ToggleSwitch = ({ value, onToggle }: { value: boolean; onToggle: () => void; }) => (
  <button type="button" onClick={onToggle} className={`${value ? 'bg-green-500' : 'bg-gray-300'} relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}>
    <span className={`${value ? 'translate-x-5' : 'translate-x-1'} inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform`} />
  </button>
);