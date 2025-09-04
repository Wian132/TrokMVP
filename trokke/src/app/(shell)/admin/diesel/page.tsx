// src/app/(shell)/admin/diesel/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { type Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircleIcon, BeakerIcon, ArrowDown, ArrowUp, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/components/AuthContext';

// --- Type Definitions ---
type Trip = Database['public']['Tables']['truck_trips']['Row'];
type DieselPurchase = Database['public']['Tables']['diesel_purchases']['Row'] & {
  is_active?: boolean;
  is_empty?: boolean;
  spillage_liters?: number | null;
  used_liters?: number;
  total_km_driven?: number;
  avg_kpl?: number;
};

type ProfileWithRole = {
  roles: { name: string } | { name: string }[] | null;
};

export default function DieselPage() {
    const supabase = createClient();
    const { user } = useAuth();
    const [purchases, setPurchases] = useState<DieselPurchase[]>([]);
    const [allTrips, setAllTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [totals, setTotals] = useState({ purchased: 0, refueled: 0, remaining: 0 });
    const [userRole, setUserRole] = useState<string | null>(null);

    const [newPurchase, setNewPurchase] = useState({ liters: '', price_per_liter: '', purchase_date: new Date().toISOString().split('T')[0] });
    const [editingPurchase, setEditingPurchase] = useState<DieselPurchase | null>(null);
    const [deletingPurchase, setDeletingPurchase] = useState<DieselPurchase | null>(null);
    const [activatingPurchase, setActivatingPurchase] = useState<DieselPurchase | null>(null);

    const fetchUserRole = useCallback(async () => {
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('roles(name)').eq('id', user.id).single();
            const typedProfile = profile as ProfileWithRole;
            setUserRole((Array.isArray(typedProfile.roles) ? typedProfile.roles[0]?.name : typedProfile.roles?.name) || null);
        }
    }, [user, supabase]);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setError(null);

        const purchasesPromise = supabase.from('diesel_purchases').select('*').order('purchase_date', { ascending: false });
        // Corrected: Fetch refuel data from the unified truck_trips table
        const refuelsPromise = supabase.from('truck_trips').select('liters_filled, tank_id');
        const tripsPromise = supabase.from('truck_trips').select('*');

        const [purchasesResult, refuelsResult, tripsResult] = await Promise.all([purchasesPromise, refuelsPromise, tripsPromise]);

        if (purchasesResult.error || refuelsResult.error || tripsResult.error) {
            setError(purchasesResult.error?.message || refuelsResult.error?.message || tripsResult.error?.message || "An unknown error occurred while fetching data.");
            setLoading(false);
            return;
        }

        const refuelsByTank = (refuelsResult.data || []).reduce((acc, r) => {
            if (r.tank_id && r.liters_filled) acc[r.tank_id] = (acc[r.tank_id] || 0) + r.liters_filled;
            return acc;
        }, {} as Record<number, number>);

        const enrichedPurchases = (purchasesResult.data || []).map(p => ({ ...p, used_liters: refuelsByTank[p.id] || 0 }));
        setPurchases(enrichedPurchases);
        setAllTrips(tripsResult.data || []);
        
        const totalPurchased = enrichedPurchases.reduce((sum, p) => sum + p.liters, 0);
        const totalRefueled = (refuelsResult.data || []).reduce((sum, r) => sum + (r.liters_filled || 0), 0);
        const totalStockRemaining = enrichedPurchases.filter(p => !p.is_empty).reduce((sum, p) => sum + (p.liters - (p.used_liters || 0)), 0);
        
        setTotals({ purchased: totalPurchased, refueled: totalRefueled, remaining: totalStockRemaining });
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchUserRole();
        fetchAllData();
    }, [fetchUserRole, fetchAllData]);
    
    const tankAnalytics = useMemo(() => {
        if (!purchases.length) return [];
        const sortedPurchases = [...purchases].sort((a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime());
        return sortedPurchases.map((purchase, index) => {
            const purchaseDate = new Date(purchase.purchase_date);
            const nextPurchaseDate = index + 1 < sortedPurchases.length ? new Date(sortedPurchases[index + 1].purchase_date) : new Date();
            
            const totalKmDriven = allTrips
                .filter(trip => {
                    const tripDate = new Date(trip.trip_date!);
                    return tripDate >= purchaseDate && tripDate < nextPurchaseDate && trip.total_km;
                })
                .reduce((sum, trip) => sum + trip.total_km!, 0);

            const usedLiters = purchase.used_liters || 0;
            const avgKpl = usedLiters > 0 ? totalKmDriven / usedLiters : 0;
            return { ...purchase, total_km_driven: totalKmDriven, avg_kpl: avgKpl };
        }).reverse();
    }, [purchases, allTrips]);

    const handleSetActive = async (markPreviousAsEmpty: boolean) => {
        if (!activatingPurchase) return;
        const currentActive = purchases.find(p => p.is_active);
        if (currentActive) {
            const updates: Partial<DieselPurchase> = { is_active: false };
            if (markPreviousAsEmpty) {
                updates.is_empty = true;
                updates.spillage_liters = currentActive.liters - (currentActive.used_liters || 0);
            }
            await supabase.from('diesel_purchases').update(updates).eq('id', currentActive.id);
        }
        await supabase.from('diesel_purchases').update({ is_active: true }).eq('id', activatingPurchase.id);
        setStatusMessage(`Purchase from ${new Date(activatingPurchase.purchase_date).toLocaleDateString()} is now active.`);
        setActivatingPurchase(null);
        await fetchAllData();
    };

    const handleCreatePurchase = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const liters = parseFloat(newPurchase.liters);
        const price_per_liter = parseFloat(newPurchase.price_per_liter);
        if (isNaN(liters) || isNaN(price_per_liter)) { setError('Please enter valid numbers.'); return; }
        const { error } = await supabase.from('diesel_purchases').insert({ liters, price_per_liter, purchase_date: newPurchase.purchase_date });
        if (error) setError(error.message); else {
            setNewPurchase({ liters: '', price_per_liter: '', purchase_date: new Date().toISOString().split('T')[0] });
            setStatusMessage('Successfully added new diesel purchase.');
            await fetchAllData();
        }
    };

    const handleUpdatePurchase = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingPurchase) return;
        const { error } = await supabase.from('diesel_purchases').update({ liters: editingPurchase.liters, price_per_liter: editingPurchase.price_per_liter, purchase_date: editingPurchase.purchase_date }).eq('id', editingPurchase.id);
        if (error) setError(error.message); else {
            setEditingPurchase(null);
            setStatusMessage('Purchase updated successfully.');
            await fetchAllData();
        }
    };

    const handleDeletePurchase = async () => {
        if (!deletingPurchase) return;
        const { error } = await supabase.from('diesel_purchases').delete().eq('id', deletingPurchase.id);
        if (error) setError(error.message); else {
            setDeletingPurchase(null);
            setStatusMessage('Purchase deleted successfully.');
            await fetchAllData();
        }
    };
    
    const isAdmin = userRole === 'SuperAdmin' || userRole === 'Admin';
    const currentActivePurchase = purchases.find(p => p.is_active);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Diesel Purchases</h1>
            
            {error && <p className="text-red-600 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
            {statusMessage && <p className="text-green-600 bg-green-100 p-3 rounded-md mb-4">{statusMessage}</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-gray-800">Total Purchased</CardTitle><ArrowDown className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-gray-900">{totals.purchased.toLocaleString()} L</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-gray-800">Total Used</CardTitle><ArrowUp className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-gray-900">{totals.refueled.toLocaleString()} L</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-gray-800">Stock Remaining</CardTitle><BeakerIcon className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-gray-900">{totals.remaining.toLocaleString(undefined, {maximumFractionDigits: 2})} L</div></CardContent></Card>
            </div>
            
            <Collapsible defaultOpen className="space-y-4 mb-8">
                <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 bg-gray-200 rounded-t-lg border-b">
                        <h2 className="text-xl font-semibold text-gray-800">Diesel Management</h2>
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 bg-white rounded-b-lg border border-t-0">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <Card className="lg:col-span-1 shadow-none border-0">
                            <CardHeader>
                                <CardTitle className="text-gray-900">Add New Purchase</CardTitle>
                                <CardDescription className="text-gray-600">Log a new bulk diesel purchase.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreatePurchase} className="space-y-4">
                                    <div><Label htmlFor="purchase_date" className="text-gray-700 font-semibold">Purchase Date</Label><Input type="date" name="purchase_date" id="purchase_date" value={newPurchase.purchase_date} onChange={(e) => setNewPurchase(p => ({...p, purchase_date: e.target.value}))} className="bg-white text-black" required /></div>
                                    <div><Label htmlFor="liters" className="text-gray-700 font-semibold">Liters</Label><Input type="number" name="liters" id="liters" value={newPurchase.liters} onChange={(e) => setNewPurchase(p => ({...p, liters: e.target.value}))} className="bg-white text-black" placeholder="e.g., 10000" required /></div>
                                    <div><Label htmlFor="price_per_liter" className="text-gray-700 font-semibold">Price Per Liter (R)</Label><Input type="number" name="price_per_liter" id="price_per_liter" value={newPurchase.price_per_liter} onChange={(e) => setNewPurchase(p => ({...p, price_per_liter: e.target.value}))} className="bg-white text-black" placeholder="e.g., 20.00" step="0.01" required /></div>
                                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700"><PlusCircleIcon className="mr-2 h-4 w-4" />Add Purchase</Button>
                                </form>
                            </CardContent>
                        </Card>
                        <Card className="lg:col-span-2 shadow-none border-0">
                            <CardHeader><CardTitle className="text-gray-900">Purchase History</CardTitle><CardDescription className="text-gray-600">History of all bulk diesel purchases.</CardDescription></CardHeader>
                            <CardContent>
                                {loading ? <p>Loading...</p> : 
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Liters (Used/Purchased)</TableHead><TableHead>Price/L</TableHead><TableHead>Remaining</TableHead>{isAdmin && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
                                        <TableBody>
                                            {purchases.map(p => (
                                                <TableRow key={p.id} className={p.is_active ? 'bg-green-50' : ''}>
                                                    <TableCell>{p.is_active ? <span className="px-2 py-1 font-semibold leading-tight text-green-700 bg-green-100 rounded-full">Active</span> : p.is_empty ? <span className="px-2 py-1 font-semibold leading-tight text-gray-700 bg-gray-100 rounded-full">Empty</span> : <Button size="sm" variant="outline" onClick={() => setActivatingPurchase(p)}>Set Active</Button>}</TableCell>
                                                    <TableCell>{new Date(p.purchase_date).toLocaleDateString()}</TableCell>
                                                    <TableCell>{(p.used_liters || 0).toLocaleString()} L / {p.liters.toLocaleString()} L</TableCell>
                                                    <TableCell>R {Number(p.price_per_liter).toFixed(2)}</TableCell>
                                                    <TableCell className={`font-semibold ${(p.liters - (p.used_liters || 0)) < 0 ? 'text-red-600' : 'text-gray-800'}`}>{(p.liters - (p.used_liters || 0)).toLocaleString(undefined, {maximumFractionDigits: 2})} L</TableCell>
                                                    {isAdmin && <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setEditingPurchase(p)}><Pencil className="h-4 w-4 text-blue-600" /></Button><Button variant="ghost" size="icon" onClick={() => setDeletingPurchase(p)}><Trash2 className="h-4 w-4 text-red-600" /></Button></TableCell>}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                }
                            </CardContent>
                        </Card>
                    </div>
                </CollapsibleContent>
            </Collapsible>
            
            <Collapsible className="space-y-4">
                <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 bg-gray-200 rounded-t-lg border-b">
                        <h2 className="text-xl font-semibold text-gray-800">Tank Analytics</h2>
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 bg-white rounded-b-lg border border-t-0">
                    {loading ? <p>Loading analytics...</p> : 
                    <Table>
                        <TableHeader><TableRow><TableHead>Purchase Date</TableHead><TableHead>Liters Used</TableHead><TableHead>Spillage</TableHead><TableHead>Total KM Driven</TableHead><TableHead>Average KM/L</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {tankAnalytics.map(tank => (
                                <TableRow key={tank.id}>
                                    <TableCell>{new Date(tank.purchase_date).toLocaleDateString()}</TableCell>
                                    <TableCell>{(tank.used_liters || 0).toLocaleString(undefined, {maximumFractionDigits: 2})} L</TableCell>
                                    <TableCell className={tank.spillage_liters ? 'text-red-600 font-semibold' : ''}>{tank.spillage_liters?.toLocaleString(undefined, {maximumFractionDigits: 2}) ?? 'N/A'} L</TableCell>
                                    <TableCell>{(tank.total_km_driven || 0).toLocaleString(undefined, {maximumFractionDigits: 0})} km</TableCell>
                                    <TableCell>{(tank.avg_kpl || 0).toFixed(2)} km/L</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    }
                </CollapsibleContent>
            </Collapsible>
            
            {/* Modals */}
            {activatingPurchase && (
                <Dialog open onOpenChange={() => setActivatingPurchase(null)}>
                    <DialogContent className="bg-white text-black">
                        <DialogHeader>
                            <DialogTitle>Activate New Purchase</DialogTitle>
                            <DialogDescription>
                                Please confirm the status of the current active tank before proceeding.
                            </DialogDescription>
                        </DialogHeader>
                        {currentActivePurchase && (
                            <div className="my-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                                <h4 className="font-bold text-yellow-800">Action Required for Current Tank</h4>
                                <p className="text-sm text-yellow-900 mt-2">The current tank has approx. <strong>{((currentActivePurchase.liters || 0) - (currentActivePurchase.used_liters || 0)).toLocaleString(undefined, {maximumFractionDigits: 2})} L</strong> remaining.</p>
                                <p className="text-sm text-yellow-900 mt-2">Is this tank now completely empty?</p>
                            </div>
                        )}
                        <DialogFooter className="gap-2">
                            {currentActivePurchase ? (
                                <>
                                    <Button variant="outline" onClick={() => handleSetActive(false)}>No, Keep Remainder</Button>
                                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleSetActive(true)}>Yes, It&apos;s Empty</Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="ghost" onClick={() => setActivatingPurchase(null)}>Cancel</Button>
                                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleSetActive(false)}>Confirm Activation</Button>
                                </>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {editingPurchase && (
                <Dialog open onOpenChange={() => setEditingPurchase(null)}>
                    <DialogContent className="bg-white text-black">
                        <DialogHeader><DialogTitle>Edit Diesel Purchase</DialogTitle></DialogHeader>
                        <form onSubmit={handleUpdatePurchase} className="space-y-4 pt-4">
                            <div><Label htmlFor="edit_date">Date</Label><Input id="edit_date" type="date" name="purchase_date" value={editingPurchase?.purchase_date?.split('T')[0] || ''} onChange={(e) => setEditingPurchase(p => p ? {...p, purchase_date: e.target.value} : null)} className="bg-white text-black border-gray-300" /></div>
                            <div><Label htmlFor="edit_liters">Liters</Label><Input id="edit_liters" type="number" name="liters" value={editingPurchase?.liters || ''} onChange={(e) => setEditingPurchase(p => p ? {...p, liters: Number(e.target.value)}: null)} className="bg-white text-black border-gray-300" /></div>
                            <div><Label htmlFor="edit_price">Price/L</Label><Input id="edit_price" type="number" name="price_per_liter" value={editingPurchase?.price_per_liter || ''} step="0.01" onChange={(e) => setEditingPurchase(p => p ? {...p, price_per_liter: Number(e.target.value)}: null)} className="bg-white text-black border-gray-300" /></div>
                            <DialogFooter><Button type="button" variant="ghost" onClick={() => setEditingPurchase(null)}>Cancel</Button><Button type="submit" className="bg-green-600 hover:bg-green-700">Save</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {deletingPurchase && (
                <Dialog open onOpenChange={() => setDeletingPurchase(null)}>
                    <DialogContent className="bg-white text-black">
                        <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle><DialogDescription>Are you sure you want to delete this purchase?</DialogDescription></DialogHeader>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setDeletingPurchase(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDeletePurchase}>Delete</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}