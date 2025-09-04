'use client';

import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User, Fuel, AlertTriangle, Wrench, Calendar, MapPin, Route, GanttChartSquare, Pencil, CheckCircle2, Info, ClipboardList } from 'lucide-react';
import { Database } from '@/types/supabase';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- Type Definitions (Updated) ---
type TruckWithDrivers = Database['public']['Tables']['trucks']['Row'] & {
  active_driver: {
    profiles: Database['public']['Tables']['profiles']['Row'] | null
  } | null;
  primary_driver: {
    profiles: Database['public']['Tables']['profiles']['Row'] | null
  } | null;
};
type Trip = Database['public']['Tables']['truck_trips']['Row'];
type PreTripCheck = Database['public']['Tables']['pre_trip_checks']['Row'];
type TruckUpdatePayload = Database['public']['Tables']['trucks']['Update'];
type AvailableWorker = { id: number; full_name: string | null };
type WorkerWithProfileData = {
  id: number;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
};

// --- Helper function to parse check results ---
const parseReportedIssues = (check: PreTripCheck | null) => {
    if (!check) return [];
    const issues: { description: string; severity: 'High' | 'Medium' }[] = [];
    const addIssue = (description: string, severity: 'High' | 'Medium' = 'Medium') => issues.push({ description, severity });
    if (!check.windshield_ok) addIssue("Windshield damaged");
    if (!check.windows_ok) addIssue("Windows issue");
    if (!check.mirrors_ok) addIssue("Mirrors damaged");
    if (!check.lights_ok) addIssue("Lights/Indicators faulty");
    if (!check.brakes_ok) addIssue("Brakes issue reported", "High");
    if (!check.hooter_ok) addIssue("Hooter/Horn not working");
    if (!check.fridge_ok) addIssue("Refrigerator Unit faulty");
    if (!check.oil_level_ok) addIssue("Oil Level low/issue");
    if (!check.coolant_level_ok) addIssue("Coolant Level low/issue");
    if (!check.tires_ok) addIssue("Tires issue", "High");
    if (check.other_issues) addIssue(`Driver Comment: ${check.other_issues}`);
    return issues;
};

export default function TruckDetailsPageClient() {
    const params = useParams();
    const router = useRouter();
    const truckIdParam = Array.isArray(params.truckId) ? params.truckId[0] : params.truckId;
    
    const [truck, setTruck] = useState<TruckWithDrivers | null>(null);
    const [lastTrip, setLastTrip] = useState<Trip | null>(null);
    const [previousTrip, setPreviousTrip] = useState<Trip | null>(null);
    const [lastCheck, setLastCheck] = useState<PreTripCheck | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!truckIdParam) return;
        setLoading(true);
        setError(null);
        const supabase = createClient();
        const id = parseInt(truckIdParam, 10);

        if (isNaN(id)) {
            setError('Invalid Truck ID.');
            setLoading(false);
            return;
        }

        try {
            const truckPromise = supabase
                .from('trucks')
                .select('*, active_driver:workers!active_driver_id(profiles(id, full_name)), primary_driver:workers!primary_driver_id(profiles(id, full_name))')
                .eq('id', id)
                .single();
            
            const tripsPromise = supabase.from('truck_trips').select('*').eq('truck_id', id).order('trip_date', { ascending: false }).limit(2);
            const checkPromise = supabase.from('pre_trip_checks').select('*').eq('truck_id', id).order('checked_at', { ascending: false }).limit(1);
            
            const [truckResult, tripsResult, checkResult] = await Promise.all([truckPromise, tripsPromise, checkPromise]);

            if (truckResult.error) throw truckResult.error;
            setTruck(truckResult.data as TruckWithDrivers);

            const tripsData = tripsResult.data || [];
            setLastTrip(tripsData.length > 0 ? tripsData[0] : null);
            setPreviousTrip(tripsData.length > 1 ? tripsData[1] : null);
            
            const checkData = checkResult.data || [];
            setLastCheck(checkData.length > 0 ? checkData[0] : null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }, [truckIdParam]);

    useEffect(() => {
        if (truckIdParam) {
           fetchData();
        }
    }, [truckIdParam, fetchData]);

    const reportedIssues = useMemo(() => parseReportedIssues(lastCheck), [lastCheck]);
    const hasMissingFields = useMemo(() => !truck ? false : !truck.make || !truck.model || !truck.year || !truck.vin || !truck.service_interval_km || !truck.next_service_km, [truck]);

    if (loading) return <div className="p-8 text-center">Loading truck details...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!truck) return <div className="p-8 text-center">No truck data available.</div>;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-gray-50 text-black">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-gray-700">{truck.make || 'Unknown Make'} {truck.model || 'Unknown Model'}</h2>
                    <p className="text-4xl font-extrabold text-gray-900 tracking-wider bg-gray-200 px-3 py-1 rounded-md inline-block mt-1">{truck.license_plate}</p>
                </div>
            </div>
            {hasMissingFields && <TruckDetailsCard truck={truck} onTruckUpdate={fetchData} />}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <DriverCard type="active" truck={truck} onTruckUpdate={fetchData} />
                <DriverCard type="primary" truck={truck} onTruckUpdate={fetchData} />
                <Card className="lg:col-span-1 bg-white flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center text-gray-800">
                            <GanttChartSquare className="mr-2" /> Last Trip Details
                            <InfoTooltip text="A summary of the most recently logged trip for this vehicle." />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-grow">
                        <div className="flex-grow">
                        {lastTrip ? (
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> <strong>Date:</strong> {lastTrip.trip_date ? new Date(lastTrip.trip_date).toLocaleDateString() : 'N/A'}</div>
                                <div className="flex items-center gap-2"><Route className="h-4 w-4 text-gray-400" /> <strong>Distance:</strong> {previousTrip?.total_km ? `${Number(previousTrip.total_km).toFixed(2)} ${truck.is_hours_based ? 'hrs' : 'km'}` : 'N/A'}</div>
                                <div className="flex items-center gap-2 col-span-2"><MapPin className="h-4 w-4 text-gray-400" /> <strong>Notes:</strong> {lastTrip.notes || 'No notes for this trip.'}</div>
                                <div className="flex items-center gap-2"><Fuel className="h-4 w-4 text-gray-400" /> <strong>Fuel Filled:</strong> {lastTrip.liters_filled ? `${Number(lastTrip.liters_filled).toFixed(2)} L` : 'N/A'}</div>
                            </div>
                        ) : (
                            <p className="text-gray-500">No trip data available for this truck.</p>
                        )}
                        </div>
                        <Button className="w-full mt-4 bg-green-700 text-white hover:bg-green-800" onClick={() => router.push(`/admin/trips?truckId=${truck.id}`)}>View Full Trip History</Button>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-6">
                <Card className="lg:col-span-3 bg-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center text-gray-800">
                                <AlertTriangle className="mr-2 text-red-500" /> Reported Issues
                                <InfoTooltip text="A list of problems or defects reported during the vehicle's latest pre-trip inspection." />
                            </CardTitle>
                            <CardDescription className="text-gray-500">Issues from the latest pre-trip check on {lastCheck ? new Date(lastCheck.checked_at).toLocaleString() : 'N/A'}.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button size="sm" className="bg-green-700 text-white hover:bg-green-800" onClick={() => router.push(`/admin/check-ins?truckId=${truck.id}`)}>
                                <ClipboardList className="h-4 w-4 mr-2"/>View All Check-ins
                             </Button>
                            {reportedIssues.length > 0 && !lastCheck?.issues_resolved && (
                                 <Button size="sm" onClick={async () => {
                                     if (!lastCheck) return;
                                     const supabase = createClient();
                                     await supabase.from('pre_trip_checks').update({ issues_resolved: true }).eq('id', lastCheck.id);
                                     fetchData();
                                 }} className="bg-green-700 text-white hover:bg-green-800 transition-transform transform hover:scale-105">
                                     <CheckCircle2 className="h-4 w-4 mr-2"/>Mark as Resolved
                                 </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {lastCheck?.issues_resolved ? (<p className="text-center text-green-600 font-semibold py-4">All reported issues have been marked as resolved.</p>) : reportedIssues.length > 0 ? (
                            <ul className="space-y-3">
                                {reportedIssues.map((issue, index) => (
                                    <li key={index} className="flex items-start justify-between p-3 rounded-lg border bg-gray-50">
                                        <div><p className="font-semibold text-gray-800">{issue.description}</p></div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${issue.severity === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{issue.severity}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (<p className="text-center text-gray-500 py-4">No issues were reported in the last pre-trip check.</p>)}
                    </CardContent>
                </Card>
                <ServiceSummaryCard truck={truck} />
            </div>
            {!hasMissingFields && <TruckDetailsCard truck={truck} onTruckUpdate={fetchData} />}
        </div>
    );
}

function TruckDetailsCard({ truck, onTruckUpdate }: { truck: TruckWithDrivers, onTruckUpdate: () => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<TruckUpdatePayload>({});
    const [error, setError] = useState<string | null>(null);
    const serviceUnit = truck.is_hours_based ? 'hours' : 'km';

    const handleEditClick = () => {
        setFormData({
            license_plate: truck.license_plate, make: truck.make, model: truck.model, vin: truck.vin,
            year: truck.year, service_interval_km: truck.service_interval_km,
            next_service_km: truck.next_service_km, notes: truck.notes,
            service_warning_threshold: truck.service_warning_threshold,
        });
        setIsEditing(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['year', 'service_interval_km', 'next_service_km', 'service_warning_threshold'].includes(name);
        setFormData(prev => ({ ...prev, [name]: value === '' ? null : (isNumeric ? Number(value) : value) }));
    };

    const handleSave = async () => {
        setError(null);
        const supabase = createClient();
        const { error: updateError } = await supabase.from('trucks').update(formData).eq('id', truck.id);
        if (updateError) {
            setError(`Failed to save: ${updateError.message}`);
        } else {
            setIsEditing(false);
            onTruckUpdate();
        }
    };

    return (
        <Card className="lg:col-span-3 bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center text-gray-800">
                        Vehicle Information
                        <InfoTooltip text="Core details and specifications for this specific vehicle." />
                    </CardTitle>
                    <CardDescription className="text-gray-500">Core details for this vehicle.</CardDescription>
                </div>
                {!isEditing && <Button size="sm" onClick={handleEditClick} className="bg-green-700 text-white hover:bg-green-800"><Pencil className="h-4 w-4 mr-2" /> Edit</Button>}
            </CardHeader>
            <CardContent>
                {isEditing ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label htmlFor="license_plate">License Plate</Label><Input id="license_plate" name="license_plate" value={formData.license_plate || ''} onChange={handleInputChange} className="bg-white text-black border-gray-300" /></div>
                            <div><Label htmlFor="make">Make</Label><Input id="make" name="make" value={formData.make || ''} onChange={handleInputChange} className="bg-white text-black border-gray-300" /></div>
                            <div><Label htmlFor="model">Model</Label><Input id="model" name="model" value={formData.model || ''} onChange={handleInputChange} className="bg-white text-black border-gray-300" /></div>
                            <div><Label htmlFor="year">Year</Label><Input id="year" name="year" type="number" value={formData.year || ''} onChange={handleInputChange} className="bg-white text-black border-gray-300" /></div>
                            <div><Label htmlFor="vin">VIN</Label><Input id="vin" name="vin" value={formData.vin || ''} onChange={handleInputChange} className="bg-white text-black border-gray-300" /></div>
                            <div><Label htmlFor="service_interval_km">Service Interval ({serviceUnit})</Label><Input id="service_interval_km" name="service_interval_km" type="number" value={formData.service_interval_km || ''} onChange={handleInputChange} className="bg-white text-black border-gray-300" /></div>
                            <div><Label htmlFor="next_service_km">Next Service ({serviceUnit})</Label><Input id="next_service_km" name="next_service_km" type="number" value={formData.next_service_km || ''} onChange={handleInputChange} className="bg-white text-black border-gray-300" /></div>
                            <div><Label htmlFor="service_warning_threshold">Service Warning Threshold ({serviceUnit})</Label><Input id="service_warning_threshold" name="service_warning_threshold" type="number" value={formData.service_warning_threshold || ''} onChange={handleInputChange} className="bg-white text-black border-gray-300" /></div>
                        </div>
                        <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleInputChange} className="bg-white text-black border-gray-300" /></div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <div className="flex justify-end gap-2 mt-4"><Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button><Button onClick={handleSave} className="bg-green-700 text-white hover:bg-green-800 font-semibold">Save Changes</Button></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                            <InfoItem label="Make" value={truck.make} tooltip="The manufacturer of the vehicle (e.g., Toyota)." />
                            <InfoItem label="Model" value={truck.model} tooltip="The specific model of the vehicle (e.g., Hilux)." />
                            <InfoItem label="Year" value={truck.year} tooltip="The manufacturing year of the vehicle." />
                            <InfoItem label="VIN" value={truck.vin} tooltip="The unique 17-character Vehicle Identification Number." />
                            <InfoItem label={`Service Interval (${serviceUnit})`} value={truck.service_interval_km ? `${truck.service_interval_km.toLocaleString()}` : null} tooltip="The distance (km) or time (hours) between scheduled maintenance services." />
                            <InfoItem label={`Next Service Due (${serviceUnit})`} value={truck.next_service_km ? `${truck.next_service_km.toLocaleString()}` : null} tooltip="The odometer reading (km or hours) at which the next service is required." />
                             <InfoItem label={`Service Warning Threshold (${serviceUnit})`} value={truck.service_warning_threshold ? `${truck.service_warning_threshold.toLocaleString()}` : null} tooltip="The distance/hours before the 'Next Service Due' point at which a warning should be triggered." />
                        </div>
                        <div className="pt-4 border-t"><InfoItem label="Notes" value={truck.notes} tooltip="General notes or comments about this specific vehicle." /></div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="relative flex items-center group ml-2">
      <Info size={16} className="text-gray-400 cursor-pointer" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-xs text-white bg-green-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
        {text}
      </div>
    </div>
  );
}

const InfoItem = ({ label, value, tooltip }: { label: string; value: string | number | null | undefined; tooltip?: string }) => (
    <div>
        <div className="text-gray-500 flex items-center">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        <p className={`font-semibold whitespace-pre-wrap ${!value ? 'text-red-500' : 'text-gray-800'}`}>{!value ? '!! Not Set' : value}</p>
    </div>
);

function ServiceSummaryCard({ truck }: { truck: TruckWithDrivers }) {
    const serviceUnit = truck.is_hours_based ? 'hours' : 'km';
    
    const renderServiceStatus = () => {
        const nextServiceValue = truck.next_service_km;
        const currentOdo = truck.current_odo;
        if (nextServiceValue && currentOdo) {
            const untilService = nextServiceValue - currentOdo;
            if (untilService > 0) return (<div><h4 className="text-2xl font-bold text-gray-800">{untilService.toLocaleString()} {serviceUnit}</h4><p className="text-xs text-gray-500">until the next service.</p></div>);
            else return (<div><h4 className="text-2xl font-bold text-red-600">Service Overdue</h4><p className="text-xs text-gray-500">By {Math.abs(untilService).toLocaleString()} {serviceUnit}.</p></div>);
        }
        return <p className="text-sm text-gray-500">Next service interval not specified.</p>;
    };

    return (
        <Card className="lg:col-span-3 bg-white">
            <CardHeader>
                <CardTitle className="flex items-center text-gray-800">
                    <Wrench className="mr-2" /> Service Status
                    <InfoTooltip text="A summary of the vehicle's maintenance status and a link to its full service history." />
                </CardTitle>
                <CardDescription className="text-gray-500">A summary of the vehicle&apos;s maintenance schedule.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>{renderServiceStatus()}</div>
                    <Link href={`/admin/trucks/${truck.id}/services`} passHref>
                        <Button className="bg-green-700 text-white hover:bg-green-800 transition-transform transform hover:scale-105">View Full History</Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

function DriverCard({ type, truck, onTruckUpdate }: { type: 'active' | 'primary', truck: TruckWithDrivers, onTruckUpdate: () => void }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [availableWorkers, setAvailableWorkers] = useState<AvailableWorker[]>([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
    const [loadingWorkers, setLoadingWorkers] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isPrimary = type === 'primary';
    const title = isPrimary ? 'Primary Driver' : 'Active Driver';
    const driverProfile = isPrimary ? truck.primary_driver?.profiles : truck.active_driver?.profiles;
    const driverId = isPrimary ? truck.primary_driver_id : truck.active_driver_id;

    const fetchAvailableWorkers = async () => {
        setLoadingWorkers(true);
        const supabase = createClient();
        const { data: workersData } = await supabase.from('workers').select('id, profiles(full_name)');
        
        if (workersData) {
            const formattedWorkers = workersData.map((w: WorkerWithProfileData) => ({
                id: w.id,
                full_name: (Array.isArray(w.profiles) ? w.profiles[0]?.full_name : w.profiles?.full_name) || `Worker ID: ${w.id}`
            }));
            setAvailableWorkers(formattedWorkers);
        }
        setLoadingWorkers(false);
    };

    const handleOpenModal = () => {
        setError(null);
        fetchAvailableWorkers();
        setSelectedWorkerId(driverId?.toString() || '');
        setIsModalOpen(true);
    };

    const handleSaveAssignment = async () => {
        console.log(`[DriverCard] Attempting to save assignment for ${type} driver.`);
        setIsSaving(true);
        setError(null);
        
        const supabase = createClient();
        const workerIdToAssign = selectedWorkerId === 'unassign' ? null : parseInt(selectedWorkerId, 10);
        
        const updatePayload: TruckUpdatePayload = isPrimary 
            ? { primary_driver_id: workerIdToAssign } 
            : { active_driver_id: workerIdToAssign };

        console.log('[DriverCard] Payload to be sent:', updatePayload);
        console.log('[DriverCard] Updating truck ID:', truck.id);
            
        try {
            const { data, error: updateError } = await supabase
                .from('trucks')
                .update(updatePayload)
                .eq('id', truck.id)
                .select(); // Use .select() to get back the data and see what was changed

            if (updateError) {
                console.error('[DriverCard] Supabase update error:', updateError);
                throw updateError;
            }
            
            console.log('[DriverCard] Supabase update successful. Response data:', data);
            onTruckUpdate();
            setIsModalOpen(false);
        } catch (err: unknown) {
            console.error("[DriverCard] Failed to save assignment:", err);
            if (err instanceof Error) {
                setError(`Error: ${err.message}`);
            } else {
                setError("An unknown error occurred.");
            }
        } finally {
            console.log(`[DriverCard] Finished save attempt for ${type} driver.`);
            setIsSaving(false);
        }
    };

    return (
        <Card className="lg:col-span-1 bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center text-gray-800">
                    <User className="mr-2"/> {title}
                    <InfoTooltip text={isPrimary ? 'The main driver permanently assigned to this vehicle. This changes less often.' : 'The driver who is currently operating the vehicle. This can change frequently.'} />
                </CardTitle>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild><Button size="sm" onClick={handleOpenModal} className="bg-green-700 text-white hover:bg-green-800">{driverProfile ? 'Change' : 'Assign'}</Button></DialogTrigger>
                    <DialogContent className="bg-green-100 text-green-900">
                        <DialogHeader><DialogTitle>Assign {title} to {truck.license_plate}</DialogTitle><DialogDescription className="text-green-800">Select an available worker or unassign the current driver.</DialogDescription></DialogHeader>
                        {loadingWorkers ? <p>Loading...</p> : (
                            <Select onValueChange={setSelectedWorkerId} defaultValue={selectedWorkerId}>
                                <SelectTrigger className="bg-white text-black"><SelectValue placeholder="Select a driver..." /></SelectTrigger>
                                <SelectContent className="bg-white text-black max-h-60">
                                    <SelectItem value="unassign">-- Unassign Driver --</SelectItem>
                                    {availableWorkers.map(worker => (<SelectItem key={worker.id} value={worker.id.toString()}>{worker.full_name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        )}
                        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                        <DialogFooter className="mt-4">
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-green-900 hover:bg-green-200">Cancel</Button>
                            <Button onClick={handleSaveAssignment} disabled={!selectedWorkerId || isSaving} className="bg-green-700 text-white hover:bg-green-800">
                                {isSaving ? 'Saving...' : 'Save Assignment'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {driverProfile ? (
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"><User className="h-6 w-6 text-gray-500" /></div>
                        <div>
                            <p className="text-lg font-semibold text-gray-900">{driverProfile.full_name}</p>
                            <p className="text-sm text-gray-500">ID: {driverProfile.id.substring(0, 8)}...</p>
                        </div>
                    </div>
                ) : <p className="text-gray-500">No {type} driver currently assigned.</p>}
            </CardContent>
        </Card>
    );
}