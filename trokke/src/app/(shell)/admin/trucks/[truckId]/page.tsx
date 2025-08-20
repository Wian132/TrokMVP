'use client';
import { createClient } from '@/utils/supabase/client';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User, Fuel, AlertTriangle, Wrench, Calendar, MapPin, Route, GanttChartSquare, Pencil, CheckCircle2 } from 'lucide-react';
import { Database } from '@/types/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';

// --- Type Definitions ---
type TruckWithWorkerProfile = Database['public']['Tables']['trucks']['Row'] & {
  workers: {
    profiles: Database['public']['Tables']['profiles']['Row'] | null
  } | null
};
type Trip = Database['public']['Tables']['truck_trips']['Row'];
type PreTripCheck = Database['public']['Tables']['pre_trip_checks']['Row'];
type TruckUpdatePayload = Database['public']['Tables']['trucks']['Update'];

// --- Helper function to parse check results ---
const parseReportedIssues = (check: PreTripCheck | null) => {
    if (!check) return [];
    
    const issues: { description: string; severity: 'High' | 'Medium' }[] = [];
    const addIssue = (description: string, severity: 'High' | 'Medium' = 'Medium') => issues.push({ description, severity });

    if (!check.windshield_ok) addIssue("Windshield damaged");
    if (!check.driver_window_ok) addIssue("Driver Window issue");
    if (!check.passenger_window_ok) addIssue("Passenger Window issue");
    if (!check.driver_mirror_ok) addIssue("Driver Mirror damaged");
    if (!check.passenger_mirror_ok) addIssue("Passenger Mirror damaged");
    if (!check.center_mirror_ok) addIssue("Center Mirror damaged");
    if (!check.lights_ok) addIssue("Lights/Indicators faulty");
    if (!check.brakes_ok) addIssue("Brakes issue reported", "High");
    if (!check.hooter_ok) addIssue("Hooter/Horn not working");
    if (!check.fridge_ok) addIssue("Refrigerator Unit faulty");
    if (!check.oil_level_ok) addIssue("Oil Level low/issue");
    if (!check.water_level_ok) addIssue("Coolant Level low/issue");

    const tires = check.tires_ok as { driver_side_ok?: boolean; passenger_side_ok?: boolean } | null;
    if (!tires?.driver_side_ok) addIssue("Driver Side Tires issue", "High");
    if (!tires?.passenger_side_ok) addIssue("Passenger Side Tires issue", "High");

    if (check.other_issues) addIssue(`Driver Comment: ${check.other_issues}`);

    return issues;
};


// --- Truck Details & Edit Card ---
function TruckDetailsCard({ truck, onTruckUpdate }: { truck: TruckWithWorkerProfile, onTruckUpdate: () => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<TruckUpdatePayload>({});
    const [error, setError] = useState<string | null>(null);
    const serviceUnit = truck.is_hours_based ? 'hours' : 'km';

    const handleEditClick = () => {
        setFormData({
            license_plate: truck.license_plate,
            make: truck.make,
            model: truck.model,
            vin: truck.vin,
            year: truck.year,
            service_interval_km: truck.service_interval_km,
            next_service_km: truck.next_service_km,
            notes: truck.notes,
        });
        setIsEditing(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['year', 'service_interval_km', 'next_service_km'].includes(name);
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
                    <CardTitle className="flex items-center gap-2 text-gray-800">Vehicle Information</CardTitle>
                    <CardDescription className="text-gray-500">Core details for this vehicle.</CardDescription>
                </div>
                {!isEditing && (
                    <Button size="sm" onClick={handleEditClick} className="bg-green-700 text-white hover:bg-green-800">
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                    </Button>
                )}
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
                        </div>
                        <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleInputChange} className="bg-white text-black border-gray-300" /></div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <div className="flex justify-end gap-2 mt-4"><Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button><Button onClick={handleSave} className="bg-green-700 text-white hover:bg-green-800 font-semibold">Save Changes</Button></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                            <InfoItem label="Make" value={truck.make} /><InfoItem label="Model" value={truck.model} /><InfoItem label="Year" value={truck.year} /><InfoItem label="VIN" value={truck.vin} />
                            <InfoItem label={`Service Interval (${serviceUnit})`} value={truck.service_interval_km ? `${truck.service_interval_km.toLocaleString()}` : null} />
                            <InfoItem label={`Next Service Due (${serviceUnit})`} value={truck.next_service_km ? `${truck.next_service_km.toLocaleString()}` : null} />
                        </div>
                        <div className="pt-4 border-t"><InfoItem label="Notes" value={truck.notes} /></div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

const InfoItem = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div><p className="text-gray-500">{label}</p><p className={`font-semibold whitespace-pre-wrap ${!value ? 'text-red-500' : 'text-gray-800'}`}>{!value ? '!! Not Set' : value}</p></div>
);

function TruckMetrics({ lastTrip, isHoursBased }: { lastTrip: Trip | null, isHoursBased: boolean }) {
  const [dieselPrice, setDieselPrice] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('globalDieselPrice') || '' : ''));
  const [costPerUnit, setCostPerUnit] = useState('N/A');

  const efficiency = useMemo(() => {
    if (lastTrip && lastTrip.total_km && lastTrip.liters_filled && lastTrip.liters_filled > 0) {
      const totalDistance = typeof lastTrip.total_km === 'string' ? parseFloat(lastTrip.total_km) : lastTrip.total_km;
      const litersFilled = typeof lastTrip.liters_filled === 'string' ? parseFloat(lastTrip.liters_filled) : lastTrip.liters_filled;
      return totalDistance / litersFilled;
    }
    return 0;
  }, [lastTrip]);

  useEffect(() => {
    const price = parseFloat(dieselPrice);
    if (price > 0 && efficiency > 0) setCostPerUnit((price / efficiency).toFixed(2));
    else setCostPerUnit('N/A');
    if (typeof window !== 'undefined') localStorage.setItem('globalDieselPrice', dieselPrice);
  }, [dieselPrice, efficiency]);

  const efficiencyUnit = isHoursBased ? 'L/hr' : 'km/L';
  const costUnit = isHoursBased ? 'per Hour' : 'per KM';
  const efficiencyValue = isHoursBased && efficiency > 0 ? (1 / efficiency).toFixed(2) : efficiency.toFixed(2);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-gray-600">Fuel Efficiency</CardTitle><Fuel className="h-4 w-4 text-gray-400" /></CardHeader><CardContent><div className="text-2xl font-bold text-gray-900">{efficiency > 0 ? efficiencyValue : 'N/A'} {efficiencyUnit}</div><p className="text-xs text-gray-500">Based on the last trip</p></CardContent></Card>
        <Card className="bg-white"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-gray-600">Cost {costUnit}</CardTitle><span className="h-4 w-4 text-gray-400 font-bold">R</span></CardHeader><CardContent><div className="text-2xl font-bold text-gray-900">{costPerUnit !== 'N/A' ? `R ${costPerUnit}` : 'N/A'}</div><p className="text-xs text-gray-500">Based on diesel price</p></CardContent></Card>
        <Card className="bg-white col-span-1 md:col-span-2"><CardHeader><CardTitle className="text-sm font-medium text-gray-600">Calculate Running Cost</CardTitle></CardHeader><CardContent><Label htmlFor="diesel-price">Current Diesel Price (R/L)</Label><div className="relative mt-2"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R</span><Input id="diesel-price" type="number" value={dieselPrice} onChange={(e) => setDieselPrice(e.target.value)} placeholder="e.g., 23.50" className="pl-7 bg-white text-black border-gray-300" /></div></CardContent></Card>
    </div>
  );
}

function ServiceSummaryCard({ truck }: { truck: TruckWithWorkerProfile }) {
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
            <CardHeader><CardTitle className="flex items-center gap-2 text-gray-800"><Wrench /> Service Status</CardTitle><CardDescription className="text-gray-500">A summary of the vehicle&apos;s maintenance schedule.</CardDescription></CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>{renderServiceStatus()}</div>
                    <Link href={`/admin/trucks/${truck.id}/services`} passHref>
                        {/* UPDATED: Button styling */}
                        <Button className="bg-green-700 text-white hover:bg-green-800 transition-transform transform hover:scale-105">View Full History</Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

export default function TruckDetailsPageWrapper() {
    const params = useParams();
    const truckIdParam = Array.isArray(params.truckId) ? params.truckId[0] : params.truckId;
    const [truck, setTruck] = useState<TruckWithWorkerProfile | null>(null);
    const [lastTrip, setLastTrip] = useState<Trip | null>(null);
    const [lastCheck, setLastCheck] = useState<PreTripCheck | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleTruckUpdate = () => setRefreshKey(prev => prev + 1);
    
    const handleResolveIssues = async () => {
        if (!lastCheck) return;
        const supabase = createClient();
        const { error } = await supabase.from('pre_trip_checks').update({ issues_resolved: true }).eq('id', lastCheck.id);
        if (error) alert(`Error resolving issues: ${error.message}`);
        else handleTruckUpdate(); 
    };

    useEffect(() => {
        async function fetchData() {
            if (!truckIdParam) { setLoading(false); return; }
            const supabase = createClient();
            const truckId = parseInt(truckIdParam, 10);
            if (isNaN(truckId)) { setError("Invalid truck ID parameter."); setLoading(false); return; }

            setLoading(true);
            const { data: truckData, error: truckError } = await supabase.from('trucks').select('*, workers(profiles(id, full_name))').eq('id', truckId).single() as { data: TruckWithWorkerProfile | null, error: PostgrestError | null };
            if (truckError || !truckData) { console.error(`Error fetching truck with ID ${truckIdParam}:`, truckError); setError('Failed to load truck data.'); setLoading(false); return; }
            setTruck(truckData);

            const { data: lastTripData, error: tripError } = await supabase.from('truck_trips').select('*').eq('truck_id', truckId).order('trip_date', { ascending: false }).limit(1).single() as { data: Trip | null, error: PostgrestError | null };
            if (tripError && tripError.code !== 'PGRST116') console.warn(`Could not fetch last trip for truck ${truckIdParam}:`, tripError.message);
            setLastTrip(lastTripData);

            const { data: lastCheckData, error: checkError } = await supabase.from('pre_trip_checks').select('*').eq('truck_id', truckId).order('checked_at', { ascending: false }).limit(1).single() as { data: PreTripCheck | null, error: PostgrestError | null };
            if (checkError && checkError.code !== 'PGRST116') console.warn(`Could not fetch last check for truck ${truckIdParam}:`, checkError.message);
            setLastCheck(lastCheckData);

            setLoading(false);
        }
        fetchData();
    }, [truckIdParam, refreshKey]);
    
    const reportedIssues = useMemo(() => parseReportedIssues(lastCheck), [lastCheck]);
    const hasMissingFields = useMemo(() => !truck ? false : !truck.make || !truck.model || !truck.year || !truck.vin || !truck.service_interval_km || !truck.next_service_km, [truck]);

    if (loading) return <div className="p-8 text-center">Loading truck details...</div>;
    if (error) notFound();
    if (!truck) return <div className="p-8 text-center">Waiting for truck information...</div>;

    const driverProfile = truck.workers?.profiles;
    const vehicleDetailsCard = (<div className="grid gap-6"><TruckDetailsCard truck={truck} onTruckUpdate={handleTruckUpdate} /></div>);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-gray-50 text-black">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-gray-700">{truck.make || 'Unknown Make'} {truck.model || 'Unknown Model'}</h2>
                    <p className="text-4xl font-extrabold text-gray-900 tracking-wider bg-gray-200 px-3 py-1 rounded-md inline-block mt-1">{truck.license_plate}</p>
                </div>
            </div>
            {hasMissingFields && vehicleDetailsCard}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-1 bg-white"><CardHeader><CardTitle className="flex items-center gap-2 text-gray-800"><User /> Current Driver</CardTitle></CardHeader><CardContent>{driverProfile ? (<div className="flex items-center space-x-4"><div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"><User className="h-6 w-6 text-gray-500" /></div><div><p className="text-lg font-semibold text-gray-900">{driverProfile.full_name}</p><p className="text-sm text-gray-500">ID: {driverProfile.id.substring(0, 8)}...</p></div></div>) : (<p className="text-gray-500">No driver currently assigned.</p>)}</CardContent></Card>
                <Card className="lg:col-span-2 bg-white"><CardHeader><CardTitle className="flex items-center gap-2 text-gray-800"><GanttChartSquare /> Last Trip Details</CardTitle></CardHeader><CardContent>{lastTrip ? (<div className="grid grid-cols-2 gap-4 text-sm text-gray-700"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> <strong>Date:</strong> {lastTrip.trip_date ? new Date(lastTrip.trip_date).toLocaleDateString() : 'N/A'}</div><div className="flex items-center gap-2"><Route className="h-4 w-4 text-gray-400" /> <strong>Distance:</strong> {lastTrip.total_km ? `${Number(lastTrip.total_km).toFixed(2)} ${truck.is_hours_based ? 'hrs' : 'km'}` : 'N/A'}</div><div className="flex items-center gap-2 col-span-2"><MapPin className="h-4 w-4 text-gray-400" /> <strong>Notes:</strong> {lastTrip.notes || 'No notes for this trip.'}</div><div className="flex items-center gap-2"><Fuel className="h-4 w-4 text-gray-400" /> <strong>Fuel Filled:</strong> {lastTrip.liters_filled ? `${Number(lastTrip.liters_filled).toFixed(2)} L` : 'N/A'}</div></div>) : (<p className="text-gray-500">No trip data available for this truck.</p>)}</CardContent></Card>
            </div>
            <TruckMetrics lastTrip={lastTrip} isHoursBased={truck.is_hours_based} />
            <div className="grid gap-6">
                <Card className="lg:col-span-3 bg-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-gray-800"><AlertTriangle className="text-red-500" /> Reported Issues</CardTitle>
                            <CardDescription className="text-gray-500">Issues from the latest pre-trip check on {lastCheck ? new Date(lastCheck.checked_at).toLocaleString() : 'N/A'}.</CardDescription>
                        </div>
                        {reportedIssues.length > 0 && !lastCheck?.issues_resolved && (
                             // UPDATED: Button styling
                             <Button size="sm" onClick={handleResolveIssues} className="bg-green-700 text-white hover:bg-green-800 transition-transform transform hover:scale-105">
                                <CheckCircle2 className="h-4 w-4 mr-2"/>Mark as Resolved
                            </Button>
                        )}
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
            {!hasMissingFields && vehicleDetailsCard}
        </div>
    );
}