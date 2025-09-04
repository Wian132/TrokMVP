// src/components/Planner.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DroppableProvided,
  type DraggableProvided,
  type DroppableStateSnapshot
} from '@hello-pangea/dnd';
import { type Tables } from '@/types/supabase';
import { createClient } from '@/utils/supabase/client';
import { SearchIcon, Truck as TruckIconLucide, User as UserIcon, Pencil, Trash2, X, ChevronsUpDown, Check, MessageSquare, Briefcase, Expand, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Toaster, toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';


// --- Type Definitions ---
type Truck = Tables<'trucks'>;
type Worker = Tables<'workers'> & {
    profiles: Pick<Tables<'profiles'>, 'full_name' | 'id'> | null;
};
type Assignment = Tables<'weekly_assignments'> & {
    weekly_assignment_assistants: { worker_id: number }[];
};

interface DayWithAssignments {
    date: string;
    assignments: Assignment[];
}

interface PlannerProps {
  readOnly: boolean;
}

// A more specific type for the pre-trip check data we're fetching
type CheckWithRole = {
    truck_id: number;
    checked_at: string;
    workers: {
        profiles: {
            roles: { name: string; } | { name: string; }[] | null;
        } | null;
    } | null;
};


// --- Constants for Activity Types ---
const activityTypes = [
    'Delivery',
    'Collection',
    'Service',
    'Out of Action',
    'Relocation',
    'Other'
] as const;

// Create a specific type from the constant array
type ActivityType = typeof activityTypes[number];

// --- Searchable Single-Select Component ---
interface SearchableSelectProps {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = "Select..." }) => {
    const [open, setOpen] = useState(false);
    const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between bg-white text-black hover:bg-gray-100">
                    {selectedLabel}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" side="bottom" align="start">
                <Command className="bg-white text-black">
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map(option => (
                                <CommandItem key={option.value} value={option.label} onSelect={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}>
                                    <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


// --- Multi-Select Component ---
interface MultiSelectProps {
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, placeholder = "Select..." }) => {
    const [open, setOpen] = useState(false);

    const handleUnselect = (value: string) => {
        onChange(selected.filter((s) => s !== value));
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className={`w-full justify-between h-auto hover:bg-gray-100 ${selected.length > 0 ? 'h-auto' : 'h-10'}`}>
                    <div className="flex gap-1 flex-wrap">
                        {selected.length > 0 ? options.filter(opt => selected.includes(opt.value)).map(option => (
                            <Badge variant="secondary" key={option.value} onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleUnselect(option.value); }}>
                                {option.label} <X className="ml-1 h-3 w-3" />
                            </Badge>
                        )) : placeholder}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" side="bottom" align="start">
                <Command className="bg-white text-black">
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map(option => (
                                <CommandItem key={option.value} value={option.label} onSelect={() => {
                                    onChange(selected.includes(option.value) ? selected.filter(s => s !== option.value) : [...selected, option.value]);
                                }}>
                                   <Check className={cn("mr-2 h-4 w-4", selected.includes(option.value) ? "opacity-100" : "opacity-0")} />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


const getWeekStartDate = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); 
    const day = d.getDay(); // Sunday = 0, Monday = 1, etc.
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
};

const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const TIME_SLOTS = Array.from({ length: 10 }, (_, i) => 4 + (i * 2));

interface AssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (assignment: Partial<Assignment & { assistant_ids: number[] }>) => void;
    assignmentData: Partial<Assignment & { assistant_ids: number[] }> | null;
    workers: Worker[];
    trucks: Truck[];
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ isOpen, onClose, onSave, assignmentData, workers, trucks }) => {
    const [formData, setFormData] = useState<Partial<Assignment & { assistant_ids: number[] }> | null>(assignmentData);

    useEffect(() => {
        setFormData(assignmentData);
    }, [assignmentData]);

    if (!isOpen || !formData) return null;

    const truckDetails = trucks.find(t => t.id === formData.truck_id);
    const handleSave = () => onSave(formData);

    const workerOptions = workers
        .filter(w => w.profiles?.full_name)
        .map(w => ({ value: w.id.toString(), label: w.profiles!.full_name! }));
    
    const activityOptions = activityTypes.map(type => ({ value: type, label: type }));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white text-gray-900">
                <DialogHeader>
                    <DialogTitle>{formData.id ? 'Edit Assignment' : 'New Assignment'}</DialogTitle>
                    <DialogDescription>
                        Details for truck <strong>{truckDetails?.license_plate}</strong> on <strong>{formData.assignment_date}</strong> at <strong>{String(formData.start_hour).padStart(2, '0')}:00</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="trip_name">Trip Name</Label>
                        <Input id="trip_name" value={formData.trip_name || ''} onChange={(e) => setFormData(f => f ? { ...f, trip_name: e.target.value } : null)} className="bg-white" placeholder="e.g., Delivery to Jan Lodge" />
                    </div>
                    <div>
                        <Label htmlFor="activity_type">Activity Type</Label>
                        <SearchableSelect
                            options={activityOptions}
                            value={formData.activity_type || ''}
                            onChange={(value) => setFormData(f => f ? { ...f, activity_type: value as ActivityType } : null)}
                            placeholder="Select an activity..."
                        />
                    </div>
                    <div>
                        <Label htmlFor="driver_id">Driver</Label>
                        <SearchableSelect
                            options={workerOptions}
                            value={formData.driver_id?.toString() || ''}
                            onChange={(value) => setFormData(f => f ? { ...f, driver_id: parseInt(value) } : null)}
                            placeholder="Select a driver..."
                        />
                    </div>
                    <div>
                        <Label htmlFor="assistant_ids">Assistants</Label>
                         <MultiSelect
                            options={workerOptions}
                            selected={formData.assistant_ids?.map(String) || []}
                            onChange={(selectedIds) => setFormData(f => f ? { ...f, assistant_ids: selectedIds.map(Number) } : null)}
                            placeholder="Select assistants..."
                        />
                    </div>
                    <div>
                        <Label htmlFor="notes">Notes / Comments</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes || ''}
                            onChange={(e) => setFormData(f => f ? { ...f, notes: e.target.value } : null)}
                            className="bg-white"
                            placeholder="Add any comments for this assignment..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} className="bg-green-700 hover:bg-green-800">Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export const Planner: React.FC<PlannerProps> = ({ readOnly }) => {
    const supabase = createClient();
    const [currentWeek, setCurrentWeek] = useState<Date>(getWeekStartDate(new Date()));
    const [days, setDays] = useState<DayWithAssignments[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAssignment, setCurrentAssignment] = useState<Partial<Assignment & { assistant_ids: number[] }> | null>(null);
    const [focusedDay, setFocusedDay] = useState<string | null>(null);
    const [validChecksSet, setValidChecksSet] = useState<Set<string>>(new Set());
    const [confirmation, setConfirmation] = useState<{
      message: string;
      onConfirm: () => void;
    } | null>(null);

    const fetchData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setIsLoading(true);
        try {
            const weekStartDate = currentWeek.toISOString().split('T')[0];
            const weekEndDate = new Date(currentWeek);
            weekEndDate.setDate(weekEndDate.getDate() + 7);
            const weekEndDateString = toLocalDateString(weekEndDate);

            const trucksPromise = supabase.from('trucks').select('*').order('license_plate');
            const workersPromise = supabase.from('workers').select('*, profiles(id, full_name)');
            const assignmentsPromise = fetch(`/api/weekly-assignments?week_start_date=${weekStartDate}`);
            const checksPromise = supabase.from('pre_trip_checks').select(`truck_id, checked_at, workers(profiles(roles(name)))`).gte('checked_at', weekStartDate).lt('checked_at', weekEndDateString);
            
            const [truckRes, workerRes, assignmentsRes, checksRes] = await Promise.all([trucksPromise, workersPromise, assignmentsPromise, checksPromise]);

            if (truckRes.error) throw truckRes.error;
            if (workerRes.error) throw workerRes.error;
            if (checksRes.error) throw checksRes.error;

            setTrucks(truckRes.data || []);
            setWorkers(workerRes.data as Worker[] || []);
            
            const validChecks = new Set<string>();
            (checksRes.data as unknown as CheckWithRole[]).forEach(check => {
                const roleRelation = check.workers?.profiles?.roles;
                const roleName = Array.isArray(roleRelation) ? roleRelation[0]?.name : roleRelation?.name;
                if (roleName === 'FloorManager' || roleName === 'Checker') {
                    const checkDate = new Date(check.checked_at).toISOString().split('T')[0];
                    validChecks.add(`${check.truck_id}_${checkDate}`);
                }
            });
            setValidChecksSet(validChecks);

            const assignmentsData = await assignmentsRes.json();
            if (assignmentsData.error) throw new Error(assignmentsData.details);
            
            const newWeekDays: DayWithAssignments[] = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(currentWeek);
                date.setDate(date.getDate() + i);
                const dateString = toLocalDateString(date);
                const assignmentsForDay = (assignmentsData || []).filter((a: Assignment) => a.assignment_date === dateString);
                
                newWeekDays.push({
                    date: dateString,
                    assignments: assignmentsForDay,
                });
            }
            setDays(newWeekDays);

        } catch (error) {
            console.error("Error fetching planner data:", error);
            toast.error("Failed to load planner data.");
        } finally {
            if (isInitialLoad) setIsLoading(false);
        }
    }, [currentWeek, supabase]);

    useEffect(() => {
        fetchData(true);

        const channel = supabase.channel('planner-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_assignments' }, () => fetchData(false))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_assignment_assistants' }, () => fetchData(false))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'pre_trip_checks' }, () => fetchData(false))
          .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData, supabase]);

    const onDragEnd = (result: DropResult) => {
        if (readOnly) return;
        const { destination, draggableId } = result;
        if (!destination) return;

        const truckId = parseInt(draggableId.replace('truck-', ''));
        const [date, time] = destination.droppableId.split('_');
        
        // --- NEW: Validation to prevent duplicate daily assignments ---
        const dayData = days.find(d => d.date === date);
        if (dayData && dayData.assignments.some(a => a.truck_id === truckId)) {
            toast.error("This truck is already scheduled for this day.", {
                description: "A truck can only have one assignment per day to avoid conflicts."
            });
            return; // Exit the function to prevent creating a new assignment
        }
        // --- END of validation ---

        const startHour = parseInt(time);
        
        let defaultDriverId: number | undefined | null = trucks.find(t => t.id === truckId)?.primary_driver_id;
        let defaultAssistantIds: number[] = [];

        let lastAssignmentForTruck: Assignment | null = null;
        for (let i = days.length - 1; i >= 0; i--) {
            if (days[i].date < date) {
                const found = [...days[i].assignments].reverse().find(a => a.truck_id === truckId);
                if (found) {
                    lastAssignmentForTruck = found;
                    break;
                }
            }
        }

        if (lastAssignmentForTruck) {
            defaultDriverId = lastAssignmentForTruck.driver_id;
            defaultAssistantIds = lastAssignmentForTruck.weekly_assignment_assistants.map(a => a.worker_id);
        }
        
        const newAssignmentObject = {
            week_start_date: currentWeek.toISOString().split('T')[0],
            truck_id: truckId,
            assignment_date: date,
            start_hour: startHour,
            end_hour: startHour + 2,
            driver_id: defaultDriverId,
            assistant_ids: defaultAssistantIds,
            notes: '',
            activity_type: 'Delivery' as ActivityType,
            trip_name: '',
        };

        setCurrentAssignment(newAssignmentObject);
        setIsModalOpen(true);
    };
    
    const handleSaveAssignment = async (assignment: Partial<Assignment & { assistant_ids: number[] }>) => {
      const dayData = days.find(d => d.date === assignment.assignment_date);
      const workersInAssignment = [assignment.driver_id, ...(assignment.assistant_ids || [])].filter(Boolean) as number[];
      const conflictingWorkers: string[] = [];
    
      if (dayData) {
        for (const workerId of workersInAssignment) {
          const workerIsAssigned = dayData.assignments.some(
            existingAssignment =>
              existingAssignment.id !== assignment.id &&
              (existingAssignment.driver_id === workerId ||
                existingAssignment.weekly_assignment_assistants.some(a => a.worker_id === workerId))
          );
    
          if (workerIsAssigned) {
            const worker = getWorkerById(workerId);
            if (worker && worker.profiles?.full_name) {
              conflictingWorkers.push(worker.profiles.full_name);
            }
          }
        }
      }
    
      const proceedWithSave = async () => {
        const isEditing = !!assignment.id;
        const apiMethod = isEditing ? 'PUT' : 'POST';
    
        const response = await fetch('/api/weekly-assignments', {
          method: apiMethod,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignment),
        });
    
        if (response.ok) {
          toast.success(`Assignment successfully ${isEditing ? 'updated' : 'created'}.`);
          fetchData(); // Force a refresh after saving
        } else {
          toast.error("Failed to save assignment.");
        }
        setIsModalOpen(false);
        setCurrentAssignment(null);
      };
    
      if (conflictingWorkers.length > 0) {
        setConfirmation({
          message: `Worker(s) ${conflictingWorkers.join(', ')} have already been assigned to a job for ${assignment.assignment_date}. Are you sure you want to assign them to another task?`,
          onConfirm: () => {
            proceedWithSave();
            setConfirmation(null);
          },
        });
      } else {
        proceedWithSave();
      }
    };

    const handleDeleteAssignment = async (assignmentId: number) => {
        const response = await fetch('/api/weekly-assignments', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: assignmentId }),
        });

        if (response.ok) {
            toast.success("Assignment deleted.");
            fetchData(); // Force a refresh after deleting
        } else {
            toast.error("Failed to delete assignment.");
        }
    };
    
    const openEditModal = (assignment: Assignment) => {
        setCurrentAssignment({
            ...assignment,
            assistant_ids: assignment.weekly_assignment_assistants.map(a => a.worker_id),
        });
        setIsModalOpen(true);
    };

    const getTruckById = (id: number) => trucks.find(t => t.id === id);
    const getWorkerById = (id: number | null) => id ? workers.find(w => w.id === id) : null;

    const filteredTrucks = useMemo(() =>
        trucks.filter(truck =>
            truck.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
            truck.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            truck.model?.toLowerCase().includes(searchTerm.toLowerCase())
        ), [trucks, searchTerm]);

    const changeWeek = (direction: 'prev' | 'next') => {
        setFocusedDay(null);
        setCurrentWeek(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
            return newDate;
        });
    };
    
    const handleFocusDay = (date: string) => {
        setFocusedDay(prev => prev === date ? null : date);
    };

    const focusedDayIndex = useMemo(() => focusedDay ? days.findIndex(d => d.date === focusedDay) : -1, [days, focusedDay]);
    const daysBeforeFocused = focusedDayIndex > -1 ? days.slice(0, focusedDayIndex) : [];
    const theFocusedDay = focusedDayIndex > -1 ? days[focusedDayIndex] : null;
    const daysAfterFocused = focusedDayIndex > -1 ? days.slice(focusedDayIndex + 1) : [];

    return (
        <div className="space-y-4">
            <Toaster richColors position="top-center" />
            <AssignmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveAssignment} assignmentData={currentAssignment} workers={workers} trucks={trucks}/>
            {confirmation && (
              <Dialog open={true} onOpenChange={() => setConfirmation(null)}>
                <DialogContent className="bg-white text-black">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900">Double Booking Confirmation</DialogTitle>
                    <DialogDescription className="text-gray-700 pt-2">{confirmation.message}</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="destructive" onClick={() => setConfirmation(null)} className="bg-red-600 hover:bg-red-700">
                      Cancel
                    </Button>
                    <Button onClick={confirmation.onConfirm} className="bg-green-600 hover:bg-green-700">Confirm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <div className="flex justify-between items-center">
                <Button onClick={() => changeWeek('prev')} className="bg-green-700 text-white hover:bg-green-800">Prev Week</Button>
                <h2 className="text-2xl font-bold text-gray-800">
                    Week of {currentWeek.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </h2>
                <Button onClick={() => changeWeek('next')} className="bg-green-700 text-white hover:bg-green-800">Next Week</Button>
            </div>
            
            <div className="flex items-center justify-center gap-6 text-xs text-gray-600 mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm bg-green-50 border border-green-200"></div>
                    <span>Checked-In</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm bg-red-50 border border-red-200"></div>
                    <span>Not Checked-In</span>
                </div>
            </div>
            
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex flex-col md:flex-row h-full gap-4">
                    {!readOnly && (
                        <div className="bg-white p-4 rounded-lg shadow-md flex-shrink-0 w-full md:w-72">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">Resources</h2>
                            <div className="relative mb-4">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input placeholder="Search trucks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white border-gray-300 focus:border-green-500 focus:ring-green-500" />
                            </div>
                            <Droppable droppableId="trucks-sidebar" isDropDisabled={true}>
                                {(provided: DroppableProvided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 h-[60vh] overflow-y-auto">
                                        {filteredTrucks.map((truck, index) => (
                                            <Draggable key={truck.id} draggableId={`truck-${truck.id}`} index={index}>
                                                {(provided: DraggableProvided) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                                        className="bg-gray-50 p-3 rounded-lg border flex items-center gap-3 cursor-grab active:cursor-grabbing hover:border-green-400">
                                                        <TruckIconLucide className="h-5 w-5 text-green-700" />
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{truck.license_plate}</p>
                                                            <p className="text-xs text-gray-500">{truck.make} {truck.model}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    )}

                    <div className="flex-grow flex flex-col md:flex-row gap-1 bg-gray-200 p-1 rounded-lg">
                        {isLoading ? (
                            <div className="w-full flex items-center justify-center h-full">
                                <p className="text-gray-800 text-lg">Loading Planner...</p>
                            </div>
                        ) : !focusedDay ? (
                            // --- DEFAULT VIEW (NO DAY FOCUSED) ---
                            days.map(day => (
                                <div key={day.date} className="bg-white rounded-lg flex flex-col flex-1 min-w-[120px]">
                                    <h3 className="font-bold text-center py-2 text-gray-800 border-b flex items-center justify-center gap-2 cursor-pointer" onClick={() => handleFocusDay(day.date)}>
                                        <div>
                                            {new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short' })}
                                            <span className="block text-xs font-normal text-gray-500">{day.date.substring(5, 7)}/{day.date.substring(8, 10)}</span>
                                        </div>
                                        <button className="p-1 hover:bg-gray-200 rounded-full"><Expand size={14}/></button>
                                    </h3>
                                    <div className="flex-grow overflow-y-auto">
                                        {TIME_SLOTS.map(hour => {
                                            const slotId = `${day.date}_${hour}`;
                                            const assignmentsInSlot = day.assignments.filter(a => a.start_hour === hour);
                                            return <Droppable key={slotId} droppableId={slotId} isDropDisabled={readOnly}>
                                                {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                                                    <div ref={provided.innerRef} {...provided.droppableProps} className={cn("border-b border-dashed p-1 space-y-1 min-h-[6rem]", snapshot.isDraggingOver ? 'bg-green-100' : '')}>
                                                        <time className="text-xs text-gray-400 pl-1">{`${hour.toString().padStart(2, '0')}:00`}</time>
                                                        {assignmentsInSlot.map(assignment => {
                                                            const truck = getTruckById(assignment.truck_id);
                                                            const driver = getWorkerById(assignment.driver_id);
                                                            const assistants = assignment.weekly_assignment_assistants.map(a => getWorkerById(a.worker_id)?.profiles?.full_name).filter(Boolean);
                                                            
                                                            const hasBeenChecked = validChecksSet.has(`${assignment.truck_id}_${day.date}`);
                                                            const cardClasses = cn("group p-1.5 rounded-md border text-xs relative", hasBeenChecked ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200");
                                                            const titleClasses = cn("font-bold flex items-center gap-1 truncate", hasBeenChecked ? "text-green-800" : "text-red-800");

                                                            return <div key={assignment.id} className={cardClasses}>
                                                                <p className={titleClasses} title={assignment.trip_name || assignment.activity_type}><Briefcase size={12} /> {assignment.trip_name || assignment.activity_type}</p>
                                                                <p className="font-bold text-base text-gray-800 flex items-center gap-1 mt-1"><TruckIconLucide size={14} /> {truck?.license_plate}</p>
                                                                <p className="text-gray-600 flex items-center gap-1"><UserIcon size={12} /> {driver?.profiles?.full_name || 'No driver'}</p>
                                                                {assistants.length > 0 && <p className="text-gray-500 truncate" title={assistants.join(', ')}>Assist: {assistants.join(', ')}</p>}
                                                                {assignment.notes && <p className="text-gray-500 truncate flex items-center gap-1 pt-1 mt-1 border-t" title={assignment.notes}><MessageSquare size={12} className={cn("flex-shrink-0", hasBeenChecked ? "border-green-100" : "border-red-100")} /> {assignment.notes}</p>}
                                                                {!readOnly && <div className="absolute top-1 right-1 flex opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openEditModal(assignment)} className="p-0.5 hover:bg-green-200 rounded"><Pencil size={12} className="text-green-700"/></button><button onClick={() => handleDeleteAssignment(assignment.id)} className="p-0.5 hover:bg-red-200 rounded"><Trash2 size={12} className="text-red-600"/></button></div>}
                                                            </div>;
                                                        })}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>;
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            // --- FOCUSED VIEW ---
                            <>
                                <div className="flex flex-col gap-1 w-auto md:w-20">
                                    {daysBeforeFocused.map(day => (
                                        <div key={day.date} className="bg-white rounded-lg cursor-pointer p-2 text-center hover:bg-gray-100" onClick={() => handleFocusDay(day.date)}>
                                            <h3 className="font-bold text-gray-800">{new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short' })}</h3>
                                            <span className="text-xs text-gray-500">{day.date.substring(5, 7)}/{day.date.substring(8, 10)}</span>
                                        </div>
                                    ))}
                                </div>

                                {theFocusedDay && (
                                    <div key={theFocusedDay.date} className="bg-white rounded-lg flex flex-col flex-grow w-full md:w-[85%]">
                                       <h3 className="font-bold text-center py-2 text-gray-800 border-b flex items-center justify-center gap-2 cursor-pointer" onClick={() => handleFocusDay(theFocusedDay.date)}>
                                            <div>
                                                {new Date(theFocusedDay.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long' })}
                                                <span className="block text-sm font-normal text-gray-500">{theFocusedDay.date.substring(5, 7)}/{theFocusedDay.date.substring(8, 10)}</span>
                                            </div>
                                            <button className="p-1 hover:bg-gray-200 rounded-full"><Minimize size={14}/></button>
                                        </h3>
                                        <div className="flex-grow overflow-y-auto">
                                            {TIME_SLOTS.map(hour => {
                                                const slotId = `${theFocusedDay.date}_${hour}`;
                                                const assignmentsInSlot = theFocusedDay.assignments.filter(a => a.start_hour === hour);
                                                return <Droppable key={slotId} droppableId={slotId} isDropDisabled={readOnly}>
                                                {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                                                    <div ref={provided.innerRef} {...provided.droppableProps} className={cn("border-b border-dashed p-2 min-h-[7rem] flex flex-wrap gap-2", snapshot.isDraggingOver ? 'bg-green-100' : '')}>
                                                        <time className="w-full text-xs text-gray-400">{`${hour.toString().padStart(2, '0')}:00`}</time>
                                                        {assignmentsInSlot.map(assignment => {
                                                            const truck = getTruckById(assignment.truck_id);
                                                            const driver = getWorkerById(assignment.driver_id);
                                                            const assistants = assignment.weekly_assignment_assistants.map(a => getWorkerById(a.worker_id)?.profiles?.full_name).filter(Boolean);
                                                            
                                                            const hasBeenChecked = validChecksSet.has(`${assignment.truck_id}_${theFocusedDay.date}`);
                                                            const cardClasses = cn("group p-3 rounded-lg border text-sm relative w-64", hasBeenChecked ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200");
                                                            const titleClasses = cn("font-bold text-base flex items-center gap-2", hasBeenChecked ? "text-green-800" : "text-red-800");

                                                            return <div key={assignment.id} className={cardClasses}>
                                                                <p className={titleClasses} title={assignment.trip_name || assignment.activity_type}><Briefcase size={14} /> {assignment.trip_name || assignment.activity_type}</p>
                                                                <p className="text-gray-700 font-semibold flex items-center gap-2 mt-1"><TruckIconLucide size={14} /> {truck?.license_plate}</p>
                                                                <p className="text-gray-600 flex items-center gap-2 mt-1"><UserIcon size={14} /> {driver?.profiles?.full_name || 'No driver'}</p>
                                                                {assistants.length > 0 && <p className="text-gray-500 truncate mt-1" title={assistants.join(', ')}>Assist: {assistants.join(', ')}</p>}
                                                                {assignment.notes && <p className={cn("text-gray-500 flex items-start gap-2 pt-2 mt-2 border-t", hasBeenChecked ? "border-green-100" : "border-red-100")} title={assignment.notes}><MessageSquare size={14} className="flex-shrink-0 mt-0.5" /> <span className="break-words">{assignment.notes}</span></p>}
                                                                {!readOnly && <div className="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openEditModal(assignment)} className="p-1 hover:bg-green-200 rounded"><Pencil size={14} className="text-green-700"/></button><button onClick={() => handleDeleteAssignment(assignment.id)} className="p-1 hover:bg-red-200 rounded"><Trash2 size={14} className="text-red-600"/></button></div>}
                                                            </div>;
                                                        })}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>;
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-1 w-auto md:w-20">
                                    {daysAfterFocused.map(day => (
                                         <div key={day.date} className="bg-white rounded-lg cursor-pointer p-2 text-center hover:bg-gray-100" onClick={() => handleFocusDay(day.date)}>
                                            <h3 className="font-bold text-gray-800">{new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short' })}</h3>
                                            <span className="text-xs text-gray-500">{day.date.substring(5, 7)}/{day.date.substring(8, 10)}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </DragDropContext>
        </div>
    );
};