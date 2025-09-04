// src/components/MobilePlanner.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { type Tables } from '@/types/supabase';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext'; // Import useAuth
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Truck, User, Users, MessageSquare, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Toaster, toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- Type Definitions ---
type Truck = Tables<'trucks'>;
type Worker = Tables<'workers'> & {
    profiles: Pick<Tables<'profiles'>, 'full_name' | 'id'> | null;
};
type Assignment = Tables<'weekly_assignments'> & {
    weekly_assignment_assistants: { worker_id: number }[];
};

// --- Helper to format date strings ---
const toLocalDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

const TIME_SLOTS = Array.from({ length: 10 }, (_, i) => 4 + (i * 2));

export default function MobilePlanner() {
    const supabase = createClient();
    const { user } = useAuth(); // Get the authenticated user
    const [currentWorkerId, setCurrentWorkerId] = useState<number | null>(null); // State to hold the worker ID
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDataForDay = useCallback(async (date: Date) => {
        setIsLoading(true);
        try {
            // Fetch current user's worker ID if not already fetched
            if (user && !currentWorkerId) {
                const { data: workerData, error: workerError } = await supabase
                    .from('workers')
                    .select('id')
                    .eq('profile_id', user.id)
                    .single();
                if (workerError) console.error("Could not fetch worker ID for current user:", workerError);
                else setCurrentWorkerId(workerData?.id || null);
            }

            const dateString = toLocalDateString(date);

            if (trucks.length === 0 || workers.length === 0) {
                const [truckRes, workerRes] = await Promise.all([
                    supabase.from('trucks').select('*'),
                    supabase.from('workers').select('*, profiles(id, full_name)')
                ]);
                if (truckRes.error) throw truckRes.error;
                if (workerRes.error) throw workerRes.error;
                setTrucks(truckRes.data || []);
                setWorkers(workerRes.data as Worker[] || []);
            }

            const { data, error } = await supabase
                .from('weekly_assignments')
                .select('*, weekly_assignment_assistants(worker_id)')
                .eq('assignment_date', dateString)
                .order('start_hour', { ascending: true });

            if (error) throw error;
            setAssignments(data || []);

        } catch (error) {
            console.error("Error fetching planner data:", error);
            toast.error("Failed to load schedule for this day.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, trucks.length, workers.length, user, currentWorkerId]);

    useEffect(() => {
        fetchDataForDay(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate]);

    const changeDay = (amount: number) => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + amount);
            return newDate;
        });
    };

    const getTruckById = (id: number) => trucks.find(t => t.id === id);
    const getWorkerById = (id: number | null) => id ? workers.find(w => w.id === id) : null;

    return (
        <div className="bg-white rounded-lg shadow-md max-w-2xl mx-auto">
            <Toaster richColors position="top-center" />
            <div className="flex items-center justify-between p-4 border-b">
                <Button variant="ghost" size="icon" onClick={() => changeDay(-1)}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="text-center">
                    <h2 className="font-bold text-lg text-gray-800">
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <CalendarIcon className="h-5 w-5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date: Date | undefined) => date && setSelectedDate(date)}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" onClick={() => changeDay(1)}>
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
            <div className="h-[70vh] overflow-y-auto">
                {isLoading ? (
                    <p className="text-center p-8 text-gray-500">Loading schedule...</p>
                ) : assignments.length === 0 ? (
                    <p className="text-center p-8 text-gray-500">No assignments scheduled for this day.</p>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {TIME_SLOTS.map(hour => {
                            const assignmentsInSlot = assignments.filter(a => a.start_hour === hour);
                            if (assignmentsInSlot.length === 0) return null;

                            return (
                                <div key={hour} className="p-4">
                                    <time className="font-bold text-indigo-700">{`${hour.toString().padStart(2, '0')}:00`}</time>
                                    <div className="mt-2 space-y-3">
                                        {assignmentsInSlot.map(assignment => {
                                            const truck = getTruckById(assignment.truck_id);
                                            const driver = getWorkerById(assignment.driver_id);
                                            const assistants = assignment.weekly_assignment_assistants.map(a => getWorkerById(a.worker_id)?.profiles?.full_name).filter(Boolean);
                                            
                                            // --- HIGHLIGHT LOGIC ---
                                            const isUserInvolved = currentWorkerId && 
                                                (assignment.driver_id === currentWorkerId || 
                                                assignment.weekly_assignment_assistants.some(a => a.worker_id === currentWorkerId));

                                            return (
                                                <div key={assignment.id} className={cn(
                                                    "p-3 rounded-lg border",
                                                    isUserInvolved 
                                                        ? "bg-green-100 border-green-300 ring-2 ring-green-200" 
                                                        : "bg-gray-50 border-gray-200"
                                                )}>
                                                    <p className="font-bold text-base text-gray-900 flex items-center gap-2"><Truck size={16} className="text-gray-600" /> {truck?.license_plate}</p>
                                                    <p className="text-sm text-gray-700 flex items-center gap-2 mt-1" title={assignment.trip_name || assignment.activity_type}><Briefcase size={14} className="text-gray-500" /> {assignment.trip_name || assignment.activity_type}</p>
                                                    <p className="text-sm text-gray-700 flex items-center gap-2 mt-2"><User size={14} className="text-gray-500" /> {driver?.profiles?.full_name || 'No driver'}</p>
                                                    {assistants.length > 0 && <p className="text-sm text-gray-600 flex items-center gap-2 mt-1" title={assistants.join(', ')}><Users size={14} className="text-gray-500" /> {assistants.join(', ')}</p>}
                                                    {assignment.notes && <p className={cn("text-sm text-gray-600 flex items-start gap-2 pt-2 mt-2 border-t", isUserInvolved ? "border-green-200" : "border-gray-200")} title={assignment.notes}><MessageSquare size={14} className="flex-shrink-0 mt-0.5 text-gray-500" /> <span className="break-words">{assignment.notes}</span></p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}