// src/components/pre-trip-check.tsx
'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { type Database } from '@/types/supabase';
import { TruckIcon, ExclamationTriangleIcon, LightBulbIcon, SunIcon, CogIcon, BeakerIcon, CloudIcon, ViewfinderCircleIcon, SpeakerWaveIcon, StopCircleIcon, FireIcon, BookOpenIcon, PencilIcon, PlusCircleIcon, Battery0Icon } from '@heroicons/react/24/outline';
import { ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';


// --- Type Definitions ---
type TruckInfo = { id: number; license_plate: string; make: string | null; model: string | null; };
type WorkerInfo = { id: number; };
type PreTripCheck = Database['public']['Tables']['pre_trip_checks']['Row'];
type CheckState = Omit<PreTripCheck, 'id' | 'checked_at' | 'truck_id' | 'worker_id'>;

type ProfileWithRole = {
    roles: { name: string } | { name: string }[] | null;
};

// --- NEW: Type for dropdown items with status ---
type DropdownTruckItem = {
  id: number;
  label: string;
  status: 'checked' | 'unchecked' | 'unscheduled';
};


// --- Default State ---
const defaultCheckState: CheckState = {
  windshield_ok: true,
  windows_ok: true,
  mirrors_ok: true,
  lights_ok: true,
  oil_level_ok: true,
  coolant_level_ok: true,
  hooter_ok: true,
  brakes_ok: true,
  fridge_ok: true,
  tires_ok: true,
  other_issues: '',
  tyre_pressure_correct: true,
  tyre_surface_condition: 'Good',
  battery_secure_and_clean: true,
  brake_fluid_level_ok: true,
  tyre_pressure_images: [],
  tyre_surface_images: [],
  issues_resolved: false,
};

// --- MODIFIED: Searchable Dropdown Component ---
const SearchableDropdown = ({
  items,
  selectedValue,
  onSelect,
  placeholder,
}: {
  items: DropdownTruckItem[];
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
            {filteredItems.map((item, index) => (
              <li
                key={item.id}
                onClick={() => {
                  onSelect(item.id.toString());
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={cn(
                    "px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900 font-medium",
                    item.status === 'checked' && 'text-green-600',
                    item.status === 'unchecked' && 'text-red-600',
                    // Add a separator between scheduled and unscheduled trucks
                    item.status === 'unscheduled' && filteredItems[index-1]?.status !== 'unscheduled' && 'border-t-2 border-dashed'
                )}
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
export default function PreTripCheckComponent() {
  const supabase = createClient();
  const { user } = useAuth();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [allTrucks, setAllTrucks] = useState<TruckInfo[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  
  // --- NEW: State for scheduled and checked trucks ---
  const [scheduledTruckIds, setScheduledTruckIds] = useState<Set<number>>(new Set());
  const [checkedTruckIds, setCheckedTruckIds] = useState<Set<number>>(new Set());

  const [truck, setTruck] = useState<TruckInfo | null>(null);
  const [worker, setWorker] = useState<WorkerInfo | null>(null);
  const [recentChecks, setRecentChecks] = useState<PreTripCheck[]>([]);
  const [todaysCheck, setTodaysCheck] = useState<PreTripCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [checkState, setCheckState] = useState<CheckState>(defaultCheckState);
  const [tyrePressureFiles, setTyrePressureFiles] = useState<FileList | null>(null);
  const [tyreSurfaceFiles, setTyreSurfaceFiles] = useState<FileList | null>(null);
  const [showEditInfoModal, setShowEditInfoModal] = useState(false);

  const isEditing = !!todaysCheck;
  const isPrivilegedUser = userRole === 'Checker' || userRole === 'FloorManager';

  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
        const today = new Date().toISOString().split('T')[0];

        // --- NEW: Fetch schedule and check statuses in parallel ---
        const schedulePromise = supabase.from('weekly_assignments').select('truck_id').eq('assignment_date', today);
        const checksPromise = supabase.from('pre_trip_checks').select('truck_id').gte('checked_at', `${today}T00:00:00.000Z`).lte('checked_at', `${today}T23:59:59.999Z`);
        const profilePromise = supabase.from('profiles').select('roles(name)').eq('id', user.id).single();

        const [scheduleRes, checksRes, profileRes] = await Promise.all([schedulePromise, checksPromise, profilePromise]);

        if (scheduleRes.error) throw new Error("Could not fetch today's schedule.");
        setScheduledTruckIds(new Set(scheduleRes.data.map(a => a.truck_id)));
        
        if (checksRes.error) throw new Error("Could not fetch today's checks.");
        setCheckedTruckIds(new Set(checksRes.data.map(c => c.truck_id)));

        if (profileRes.error) throw new Error("Could not fetch user profile.");
        const typedProfile = profileRes.data as ProfileWithRole;
        const roleRelation = typedProfile.roles;
        const roleName = Array.isArray(roleRelation) ? roleRelation[0]?.name : roleRelation?.name;
        setUserRole(roleName || null);
        
        const { data: workerData, error: workerError } = await supabase.from('workers').select('id').eq('profile_id', user.id).single();
        if (workerError) console.warn("User may not be a standard worker, which is expected for privileged roles.");
        setWorker(workerData);
        
        if (roleName === 'Checker' || roleName === 'FloorManager') {
            const { data: trucksData, error: trucksError } = await supabase.from('trucks').select('id, license_plate, make, model').order('license_plate');
            if(trucksError) throw new Error("Could not fetch truck list.");
            setAllTrucks(trucksData || []);
        } else { // Worker role
            if (!workerData) throw new Error("Could not find your worker profile.");
            const { data: truckData, error: truckError } = await supabase.from('trucks').select('id, license_plate, make, model').eq('assigned_worker_id', workerData.id).single();
            if (truckError || !truckData) throw new Error("You are not assigned to a truck.");
            setTruck(truckData);
            setSelectedTruckId(truckData.id.toString());
        }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch checks when a truck is selected
  useEffect(() => {
      const fetchChecksForTruck = async () => {
          if (!selectedTruckId) {
              setRecentChecks([]);
              setTodaysCheck(null);
              setCheckState(defaultCheckState);
              return;
          };

          const truckData = allTrucks.find(t => t.id.toString() === selectedTruckId) || truck;
          setTruck(truckData || null);

          const { data: checksData, error: checksError } = await supabase.from('pre_trip_checks').select('*').eq('truck_id', selectedTruckId).order('checked_at', { ascending: false }).limit(5);
          if (checksError) {
              setError(checksError.message);
              return;
          }
      
          setRecentChecks(checksData || []);
      
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const mostRecentCheck = checksData && checksData.length > 0 ? checksData[0] : null;

          if (mostRecentCheck && new Date(mostRecentCheck.checked_at) >= today) {
              setTodaysCheck(mostRecentCheck);
              const checkData = { ...mostRecentCheck };
              delete (checkData as Partial<typeof checkData>).id;
              setCheckState({ 
                  ...defaultCheckState, 
                  ...checkData,
                  tyre_surface_condition: checkData.tyre_surface_condition as 'Good' | 'Average' | 'Bad' | null,
                  other_issues: checkData.other_issues ?? '',
                  tyre_pressure_images: checkData.tyre_pressure_images ?? [],
                  tyre_surface_images: checkData.tyre_surface_images ?? [],
              });
          } else {
              setTodaysCheck(null);
              if (mostRecentCheck) {
                  const checkData = { ...mostRecentCheck };
                  delete (checkData as Partial<typeof checkData>).id;
                  delete (checkData as Partial<typeof checkData>).checked_at;
                  setCheckState({ 
                      ...defaultCheckState, 
                      ...checkData,
                      tyre_surface_condition: checkData.tyre_surface_condition as 'Good' | 'Average' | 'Bad' | null,
                      other_issues: '',
                      tyre_pressure_images: checkData.tyre_pressure_images ?? [],
                      tyre_surface_images: checkData.tyre_surface_images ?? [],
                  });
              } else {
                  setCheckState(defaultCheckState);
              }
          }
      }
      fetchChecksForTruck();

  }, [selectedTruckId, supabase, allTrucks, truck]);

  const handleToggle = (field: keyof Omit<CheckState, 'other_issues' | 'tyre_surface_condition' | 'tyre_pressure_images' | 'tyre_surface_images' | 'issues_resolved'>) => {
    setCheckState(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const handleEditClick = (check: PreTripCheck) => {
      if (!isCheckEditable(check.checked_at)) {
          setShowEditInfoModal(true);
          return;
      }

      setTodaysCheck(check);
      const checkData = { ...check };
      delete (checkData as Partial<typeof checkData>).id;
      setCheckState({ 
          ...defaultCheckState, 
          ...checkData,
          tyre_surface_condition: check.tyre_surface_condition as 'Good' | 'Average' | 'Bad' | null,
          other_issues: check.other_issues ?? '',
          tyre_pressure_images: check.tyre_pressure_images ?? [],
          tyre_surface_images: check.tyre_surface_images ?? [],
      });
      window.scrollTo(0, 0);
  }

  const uploadFiles = async (files: FileList | null, folder: string): Promise<string[]> => {
    if (!files || files.length === 0 || !truck) return [];

    const uploadPromises = Array.from(files).map(async (file) => {
        const filePath = `${truck.id}/${folder}/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
            .from('tires_from_checklist')
            .upload(filePath, file);

        if (error) {
            throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        const { data: { publicUrl } } = supabase.storage.from('tires_from_checklist').getPublicUrl(data.path);
        return publicUrl;
    });

    return Promise.all(uploadPromises);
};


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!truck || !worker) {
      setError("Cannot submit: Missing truck or a valid worker/checker profile for logging.");
      return;
    }
    setStatusMessage(isEditing ? "Updating checklist..." : "Submitting your checklist...");
    setError(null);
  
    try {
      const [pressureImageUrls, surfaceImageUrls] = await Promise.all([
        uploadFiles(tyrePressureFiles, 'pressure'),
        uploadFiles(tyreSurfaceFiles, 'surface'),
      ]);
  
      const basePayload = {
        ...checkState,
        truck_id: truck.id,
        worker_id: worker.id,
        tyre_pressure_images: pressureImageUrls,
        tyre_surface_images: surfaceImageUrls,
      };
  
      if (isEditing && todaysCheck) {
        const { error: updateError } = await supabase.from('pre_trip_checks').update({ ...basePayload, issues_resolved: false }).eq('id', todaysCheck.id);
        if (updateError) throw updateError;
        setStatusMessage("Checklist updated successfully!");
      } else {
        const insertPayload = { ...basePayload };
        delete (insertPayload as Partial<PreTripCheck>).checked_at; // Ensure DB sets the timestamp
        const { error: insertError } = await supabase.from('pre_trip_checks').insert(insertPayload);
        if (insertError) throw insertError;
        setStatusMessage("Checklist submitted successfully!");
      }
      
      await fetchInitialData(); // Full refresh to update schedule/check status
      
      // Keep the form visible but reset state
      const currentTruckId = selectedTruckId;
      setSelectedTruckId('');
      setSelectedTruckId(currentTruckId);

    } catch (err) {
      setError(err instanceof Error ? `Submission failed: ${err.message}` : "An unknown error occurred during submission.");
      setStatusMessage(null);
    }
  };
  
  
  const isCheckEditable = (checkDate: string): boolean => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(checkDate) > twentyFourHoursAgo;
  }

  const getIssuesSummary = (check: PreTripCheck): string => {
      const issues = Object.entries(check).filter(([key, value]) => key.endsWith('_ok') && value === false);
      if (check.other_issues) issues.push(['other_issues', check.other_issues]);
      if (issues.length === 0) return 'No issues reported';
      return `${issues.length} issue(s) reported`;
  }
  
  const truckItemsForDropdown = useMemo(() => {
    const scheduled: DropdownTruckItem[] = [];
    const unscheduled: DropdownTruckItem[] = [];

    for (const truck of allTrucks) {
        const item = {
            id: truck.id,
            label: `${truck.license_plate} (${truck.make} ${truck.model})`,
            status: 'unscheduled' as DropdownTruckItem['status'],
        };
        if (scheduledTruckIds.has(truck.id)) {
            item.status = checkedTruckIds.has(truck.id) ? 'checked' : 'unchecked';
            scheduled.push(item);
        } else {
            unscheduled.push(item);
        }
    }

    scheduled.sort((a, b) => {
        if (a.status === 'unchecked' && b.status !== 'unchecked') return -1;
        if (a.status !== 'unchecked' && b.status === 'unchecked') return 1;
        return a.label.localeCompare(b.label);
    });
    
    return [...scheduled, ...unscheduled];
  }, [allTrucks, scheduledTruckIds, checkedTruckIds]);


  if (loading) return <div className="p-4 text-center font-semibold">Loading your details...</div>;
  if (error) return <div className="p-4 bg-white rounded-lg shadow-md max-w-md mx-auto text-center text-red-600"><ExclamationTriangleIcon className="h-10 w-10 mx-auto mb-3" /><h2 className="text-lg font-bold">An Error Occurred</h2><p className="text-sm">{error}</p></div>;

  return (
    <div className="p-2 sm:p-4 max-w-2xl mx-auto space-y-6">
      <Dialog open={showEditInfoModal} onOpenChange={setShowEditInfoModal}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Edit Window Closed</DialogTitle>
                  <DialogDescription className="pt-4">
                      You can only edit a pre-trip check up to 24 hours after its initial submission. For older entries, please contact an administrator if changes are needed.
                  </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                  <Button onClick={() => setShowEditInfoModal(false)}>OK</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="text-center border-b pb-3 mb-4">
          <TruckIcon className="h-8 w-8 mx-auto text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-800 mt-1">{isEditing ? "Edit Today's Check" : "Pre-Trip Vehicle Check"}</h1>
          {isPrivilegedUser ? (
              <div className="max-w-sm mx-auto mt-2">
                 {/* --- NEW: Legend for Check-in Status --- */}
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mb-2">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Checked</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>Needs Check</span>
                    </div>
                </div>
                <SearchableDropdown
                    items={truckItemsForDropdown}
                    selectedValue={selectedTruckId}
                    onSelect={setSelectedTruckId}
                    placeholder="Select a truck to check..."
                />
              </div>
          ) : (
            <p className="text-sm text-gray-600">For: <strong>{truck?.make} {truck?.model} - {truck?.license_plate}</strong></p>
          )}
        </div>

        {selectedTruckId ? (
            <>
                {statusMessage && <p className="text-blue-600 mb-4 text-center text-sm bg-blue-50 p-3 rounded-md">{statusMessage}</p>}
                
                <form onSubmit={handleSubmit}>
                  <div className="space-y-3">
                    <CheckSection title="Exterior Checks">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                            <ChecklistItem icon={SunIcon} label="Windshield" value={checkState.windshield_ok} onToggle={() => handleToggle('windshield_ok')} />
                            <ChecklistItem icon={SunIcon} label="Windows" value={checkState.windows_ok} onToggle={() => handleToggle('windows_ok')} />
                            <ChecklistItem icon={ViewfinderCircleIcon} label="Mirrors" value={checkState.mirrors_ok} onToggle={() => handleToggle('mirrors_ok')} />
                            <ChecklistItem icon={CogIcon} label="Tires" value={checkState.tires_ok} onToggle={() => handleToggle('tires_ok')} />
                        </div>
                    </CheckSection>

                    <CheckSection title="Systems Check">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                            <ChecklistItem icon={LightBulbIcon} label="Lights" value={checkState.lights_ok} onToggle={() => handleToggle('lights_ok')} />
                            <ChecklistItem icon={SpeakerWaveIcon} label="Hooter" value={checkState.hooter_ok} onToggle={() => handleToggle('hooter_ok')} />
                            <ChecklistItem icon={StopCircleIcon} label="Brakes" value={checkState.brakes_ok} onToggle={() => handleToggle('brakes_ok')} />
                            <ChecklistItem icon={FireIcon} label="Fridge Unit" value={checkState.fridge_ok} onToggle={() => handleToggle('fridge_ok')} />
                        </div>
                    </CheckSection>
                     <CheckSection title="Fluid Levels & Battery">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                            <ChecklistItem icon={BeakerIcon} label="Oil Level" value={checkState.oil_level_ok} onToggle={() => handleToggle('oil_level_ok')} />
                            <ChecklistItem icon={CloudIcon} label="Coolant Level" value={checkState.coolant_level_ok} onToggle={() => handleToggle('coolant_level_ok')} />
                            <ChecklistItem icon={StopCircleIcon} label="Brake Fluid" value={checkState.brake_fluid_level_ok} onToggle={() => handleToggle('brake_fluid_level_ok')} />
                            <ChecklistItem icon={Battery0Icon} label="Battery Secure" value={checkState.battery_secure_and_clean} onToggle={() => handleToggle('battery_secure_and_clean')} />
                        </div>
                    </CheckSection>

                    <CheckSection title="Tyre Inspection">
                        <div className="space-y-4">
                           <ChecklistItem icon={CogIcon} label="Tyre Pressure Correct" value={checkState.tyre_pressure_correct} onToggle={() => handleToggle('tyre_pressure_correct')} />
                            <div>
                               <label className="block text-xs font-medium text-gray-700 mb-1">Tyre Surface Condition</label>
                                <select 
                                    value={checkState.tyre_surface_condition || ''}
                                    onChange={(e) => setCheckState(prev => ({...prev, tyre_surface_condition: e.target.value as 'Good' | 'Average' | 'Bad'}))}
                                    className="w-full p-2 border rounded-md text-gray-900 text-sm"
                                >
                                    <option value="Good">Good</option>
                                    <option value="Average">Average</option>
                                    <option value="Bad">Bad</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tyre Pressure Photos (Optional)</label>
                                <input 
                                    type="file" 
                                    multiple 
                                    onChange={(e) => setTyrePressureFiles(e.target.files)}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tyre Surface Photos (Optional)</label>
                                <input 
                                    type="file" 
                                    multiple 
                                    onChange={(e) => setTyreSurfaceFiles(e.target.files)}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                                />
                            </div>
                        </div>
                    </CheckSection>
                  </div>

                  <div className="mt-4">
                    <label htmlFor="other_issues" className="block text-xs font-medium text-gray-700 mb-1">Other Issues or Comments</label>
                    <textarea id="other_issues" value={checkState.other_issues || ''} onChange={(e) => setCheckState(p => ({ ...p, other_issues: e.target.value }))} rows={2} className="w-full p-2 border rounded-md text-gray-900 text-sm placeholder-gray-500 shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="If any item is not OK, please describe the issue here..."/>
                  </div>

                  <button type="submit" className="w-full mt-4 flex justify-center items-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-bold text-base disabled:bg-indigo-300">
                    {isEditing ? <PencilIcon className="h-5 w-5"/> : <PlusCircleIcon className="h-5 w-5"/>}
                    {isEditing ? 'Update Check' : 'Submit Check'}
                  </button>
                </form>

                <div className="mt-6 bg-white pt-6 rounded-lg">
                    <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><BookOpenIcon className="h-6 w-6 text-indigo-600"/>Recent Check History for {truck?.license_plate}</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Summary</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {recentChecks.length > 0 ? recentChecks.map((check) => (
                                    <tr key={check.id}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{new Date(check.checked_at).toLocaleString()}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{getIssuesSummary(check)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                            <button onClick={() => handleEditClick(check)} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center gap-1 ml-auto">
                                                <PencilIcon className="h-4 w-4"/> Edit
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="text-center py-4 text-sm text-gray-500">No recent checks found for this truck.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        ) : (
            <div className="text-center py-10 text-gray-500">
                {isPrivilegedUser ? <p>Please select a truck to begin the check.</p> : null}
            </div>
        )}
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