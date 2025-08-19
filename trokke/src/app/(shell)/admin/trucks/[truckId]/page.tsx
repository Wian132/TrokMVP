'use client';
import { createClient } from '@/utils/supabase/client';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Fuel, AlertTriangle, Wrench, Calendar, MapPin, Route, GanttChartSquare } from 'lucide-react';
import { Database } from '@/types/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';

// Define more specific types for the data we expect to receive
type TruckWithWorkerProfile = Database['public']['Tables']['trucks']['Row'] & {
  workers: {
    profiles: Database['public']['Tables']['profiles']['Row'] | null
  } | null
};

type Trip = Database['public']['Tables']['truck_trips']['Row'];

/**
 * A client component to manage and display truck metrics dynamically.
 */
function TruckMetrics({ lastTrip }: { lastTrip: Trip | null }) {
  const [dieselPrice, setDieselPrice] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('globalDieselPrice') || '';
    }
    return '';
  });
  const [costPerKm, setCostPerKm] = useState('N/A');

  const kmPerLiter = useMemo(() => {
    if (lastTrip && lastTrip.total_km && lastTrip.liters_filled && lastTrip.liters_filled > 0) {
      const totalKm = typeof lastTrip.total_km === 'string' ? parseFloat(lastTrip.total_km) : lastTrip.total_km;
      const litersFilled = typeof lastTrip.liters_filled === 'string' ? parseFloat(lastTrip.liters_filled) : lastTrip.liters_filled;
      return totalKm / litersFilled;
    }
    return 0;
  }, [lastTrip]);

  useEffect(() => {
    const price = parseFloat(dieselPrice);
    if (price > 0 && kmPerLiter > 0) {
      setCostPerKm((price / kmPerLiter).toFixed(2));
    } else {
      setCostPerKm('N/A');
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('globalDieselPrice', dieselPrice);
    }
  }, [dieselPrice, kmPerLiter]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Fuel Efficiency</CardTitle>
                <Fuel className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-gray-900">{kmPerLiter > 0 ? kmPerLiter.toFixed(2) : 'N/A'} km/L</div>
                <p className="text-xs text-gray-500">Based on the last trip</p>
            </CardContent>
        </Card>
        <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Cost per KM</CardTitle>
                <span className="h-4 w-4 text-gray-400 font-bold">R</span>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                    {costPerKm !== 'N/A' ? `R ${costPerKm}` : 'N/A'}
                </div>
                <p className="text-xs text-gray-500">Based on diesel price</p>
            </CardContent>
        </Card>
        <Card className="bg-white col-span-1 md:col-span-2">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Calculate Running Cost</CardTitle>
            </CardHeader>
            <CardContent>
                <Label htmlFor="diesel-price">Current Diesel Price (R/L)</Label>
                <div className="relative mt-2">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R</span>
                    <Input
                        id="diesel-price"
                        type="number"
                        value={dieselPrice}
                        onChange={(e) => setDieselPrice(e.target.value)}
                        placeholder="e.g., 23.50"
                        className="pl-7 bg-white text-black border-gray-300"
                    />
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

/**
 * Displays a summary of the truck's service status and links to the full history.
 */
function ServiceSummaryCard({ truckId, lastTrip }: { truckId: number; lastTrip: Trip | null }) {
    const [lastService, setLastService] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLastService() {
            setLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from('truck_trips')
                .select('*')
                .eq('truck_id', truckId)
                .or('expense_amount.not.is.null,comments.not.is.null')
                .order('trip_date', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') { // Ignore 'exact one row not found'
                console.error('Error fetching last service:', error);
            } else {
                setLastService(data);
            }
            setLoading(false);
        }

        fetchLastService();
    }, [truckId]);
    
    const renderServiceStatus = () => {
        if (loading) return <p className="text-sm text-gray-500">Calculating service status...</p>;
        if (!lastService) return <p className="text-sm text-gray-500">No service history to determine next interval.</p>;

        const nextServiceKm = lastService.next_service_km ? Number(lastService.next_service_km) : null;
        const currentKm = lastTrip?.opening_km ? Number(lastTrip.opening_km) : null;

        if (nextServiceKm && currentKm) {
            const kmUntilService = nextServiceKm - currentKm;
            if (kmUntilService > 0) {
                return (
                    <div>
                        <h4 className="text-2xl font-bold text-gray-800">{kmUntilService.toLocaleString()} km</h4>
                        <p className="text-xs text-gray-500">until the next service.</p>
                    </div>
                );
            } else {
                return (
                    <div>
                        <h4 className="text-2xl font-bold text-red-600">Service Overdue</h4>
                        <p className="text-xs text-gray-500">By {Math.abs(kmUntilService).toLocaleString()} km.</p>
                    </div>
                );
            }
        }
        return <p className="text-sm text-gray-500">Next service interval not specified.</p>;
    };

    return (
        <Card className="lg:col-span-3 bg-white">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800"><Wrench /> Service Status</CardTitle>
                <CardDescription className="text-gray-500">A summary of the vehicle&apos;s maintenance schedule.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>{renderServiceStatus()}</div>
                    <Link href={`/admin/trucks/${truckId}/services`} passHref>
                        <Button>View Full History</Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}


/**
 * Renders a detailed page for a specific truck.
 */
export default function TruckDetailsPageWrapper() {
    const params = useParams();
    const truckIdParam = Array.isArray(params.truckId) ? params.truckId[0] : params.truckId;

    const [truck, setTruck] = useState<TruckWithWorkerProfile | null>(null);
    const [lastTrip, setLastTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            if (!truckIdParam) {
                setLoading(false);
                return;
            }

            const supabase = createClient();
            const truckId = parseInt(truckIdParam, 10);

            if (isNaN(truckId)) {
                setError("Invalid truck ID parameter.");
                setLoading(false);
                return;
            }

            // Fetch truck data
            const { data: truckData, error: truckError } = await supabase
                .from('trucks')
                .select('*, workers(profiles(id, full_name))')
                .eq('id', truckId)
                .single() as { data: TruckWithWorkerProfile | null, error: PostgrestError | null };

            if (truckError || !truckData) {
                console.error(`Error fetching truck with ID ${truckIdParam}:`, truckError);
                setError('Failed to load truck data.');
                setLoading(false);
                return;
            }
            setTruck(truckData);

            // Fetch last trip data for the entire page
            const { data: lastTripData, error: tripError } = await supabase
                .from('truck_trips')
                .select('*')
                .eq('truck_id', truckId)
                .order('trip_date', { ascending: false })
                .limit(1)
                .single() as { data: Trip | null, error: PostgrestError | null };
            
            if (tripError) {
                console.warn(`Could not fetch last trip for truck ${truckIdParam}:`, tripError.message);
            }
            setLastTrip(lastTripData);
            setLoading(false);
        }

        fetchData();
    }, [truckIdParam]);

    if (loading) {
        return <div className="p-8 text-center">Loading truck details...</div>;
    }

    if (error) {
        notFound();
    }
    
    if (!truck) {
        return <div className="p-8 text-center">Waiting for truck information...</div>;
    }

    // --- MOCK DATA ---
    const issues = [
        { id: 1, description: 'Brake pads need checking', reported_at: new Date().toISOString(), severity: 'Medium' },
        { id: 2, description: 'Left headlight is out', reported_at: new Date(Date.now() - 86400000).toISOString(), severity: 'Low' },
    ];
    // --- END MOCK DATA ---

    const driverProfile = truck.workers?.profiles;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-gray-50 text-black">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-gray-700">
                        {truck.make} {truck.model}
                    </h2>
                    <p className="text-4xl font-extrabold text-gray-900 tracking-wider bg-gray-200 px-3 py-1 rounded-md inline-block mt-1">{truck.license_plate}</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-1 bg-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-800"><User /> Current Driver</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {driverProfile ? (
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                    <User className="h-6 w-6 text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-gray-900">{driverProfile.full_name}</p>
                                    <p className="text-sm text-gray-500">ID: {driverProfile.id.substring(0, 8)}...</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500">No driver currently assigned.</p>
                        )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2 bg-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-800"><GanttChartSquare /> Last Trip Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {lastTrip ? (
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> <strong>Date:</strong> {lastTrip.trip_date ? new Date(lastTrip.trip_date).toLocaleDateString() : 'N/A'}</div>
                                <div className="flex items-center gap-2"><Route className="h-4 w-4 text-gray-400" /> <strong>Distance:</strong> {lastTrip.total_km ? `${Number(lastTrip.total_km).toFixed(2)} km` : 'N/A'}</div>
                                <div className="flex items-center gap-2 col-span-2"><MapPin className="h-4 w-4 text-gray-400" /> <strong>Notes:</strong> {lastTrip.notes || 'No notes for this trip.'}</div>
                                <div className="flex items-center gap-2"><Fuel className="h-4 w-4 text-gray-400" /> <strong>Fuel Filled:</strong> {lastTrip.liters_filled ? `${Number(lastTrip.liters_filled).toFixed(2)} L` : 'N/A'}</div>
                            </div>
                        ) : (
                            <p className="text-gray-500">No trip data available for this truck.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <TruckMetrics lastTrip={lastTrip} />

            <div className="grid gap-6">
                <Card className="lg:col-span-3 bg-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-800"><AlertTriangle className="text-red-500" /> Reported Issues</CardTitle>
                        <CardDescription className="text-gray-500">Issues reported by drivers during pre-trip checks.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {issues.length > 0 ? (
                            <ul className="space-y-3">
                                {issues.map((issue) => (
                                    <li key={issue.id} className="flex items-start justify-between p-3 rounded-lg border bg-gray-50">
                                        <div>
                                            <p className="font-semibold text-gray-800">{issue.description}</p>
                                            <p className="text-sm text-gray-500">
                                                Reported on {new Date(issue.reported_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${issue.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                            {issue.severity}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500 py-4">No issues reported for this truck.</p>
                        )}
                    </CardContent>
                </Card>
                <ServiceSummaryCard truckId={truck.id} lastTrip={lastTrip} />
            </div>
        </div>
    );
}