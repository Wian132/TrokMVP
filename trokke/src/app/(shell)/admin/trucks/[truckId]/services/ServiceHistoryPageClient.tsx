// src/app/(shell)/admin/trucks/[truckId]/services/ServiceHistoryPageClient.tsx
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Database } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wrench, DollarSign, Gauge } from 'lucide-react';

// --- Type Definitions ---
type ServiceRecord = Database['public']['Tables']['services']['Row'];
type TruckRecord = Database['public']['Tables']['trucks']['Row'];

export default function ServiceHistoryPageClient() {
    const params = useParams();
    const truckIdParam = Array.isArray(params.truckId) ? params.truckId[0] : params.truckId;

    const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);
    const [truck, setTruck] = useState<TruckRecord | null>(null);
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
            const truckPromise = supabase.from('trucks').select('*').eq('id', id).single();
            const servicesPromise = supabase.from('services').select('*').eq('truck_id', id).order('service_date', { ascending: false });
            const [truckResult, servicesResult] = await Promise.all([truckPromise, servicesPromise]);
            if (truckResult.error) throw truckResult.error;
            if (servicesResult.error) throw servicesResult.error;
            setTruck(truckResult.data);
            setServiceHistory(servicesResult.data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }, [truckIdParam]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalExpenses = useMemo(() => {
        return serviceHistory.reduce((acc, service) => acc + (service.expense_amount || 0), 0);
    }, [serviceHistory]);

    const nextServiceOdo = useMemo(() => {
        if (!truck) return null;
        const lastService = serviceHistory.find(s => s.comments?.toLowerCase().includes('service'));
        const lastOdo = lastService?.odo_reading || truck?.current_odo || 0;
        if (lastOdo) {
            return Number(lastOdo) + (truck.service_interval_km || 40000); // Use truck's interval or default
        }
        return null;
    }, [serviceHistory, truck]);

    if (loading) return <div className="p-8 text-center">Loading service history...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-gray-50 text-black">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                        <Wrench /> Service History for {truck?.license_plate || `Truck ID`}
                    </CardTitle>
                    <CardDescription>A complete log of all maintenance and service events for this vehicle.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold">R {totalExpenses.toFixed(2)}</div></CardContent>
                        </Card>
                        <Card>
                             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Next Service Due</CardTitle>
                                <Gauge className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold">{nextServiceOdo ? `${nextServiceOdo.toLocaleString()} ${truck?.is_hours_based ? 'hrs' : 'km'}`: 'N/A'}</div></CardContent>
                        </Card>
                    </div>
                    {serviceHistory.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Odometer</TableHead><TableHead>Supplier</TableHead><TableHead>Description</TableHead><TableHead>Items Serviced</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {serviceHistory.map((service) => (
                                    <TableRow key={service.id}>
                                        <TableCell>{service.service_date ? new Date(service.service_date).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell>{service.odo_reading ? `${Number(service.odo_reading).toLocaleString()} ${truck?.is_hours_based ? 'hrs' : 'km'}` : 'N/A'}</TableCell>
                                        <TableCell>{service.supplier}</TableCell>
                                        <TableCell>{service.comments}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {service.oil_filter && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Oil Filter</span>}
                                                {service.diesel_filter && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Diesel Filter</span>}
                                                {service.air_filter && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Air Filter</span>}
                                                {service.tires && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Tires</span>}
                                                {service.brakes && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Brakes</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{service.expense_amount ? `R ${Number(service.expense_amount).toFixed(2)}` : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-10"><p className="text-gray-500">No service history found.</p></div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}