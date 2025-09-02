'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { type Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircleIcon, BeakerIcon, ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from '@/components/AuthContext';

type DieselPurchase = Database['public']['Tables']['diesel_purchases']['Row'];

// --- FIX START ---
// Define the expected shape of the profile data with the nested role.
// This tells TypeScript what the 'roles' property will look like.
type ProfileWithRole = {
  roles: { name: string } | { name: string }[] | null;
};
// --- FIX END ---


export default function DieselPage() {
    const supabase = createClient();
    const { user } = useAuth();
    const [purchases, setPurchases] = useState<DieselPurchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [totals, setTotals] = useState({ purchased: 0, refueled: 0 });
    const [userRole, setUserRole] = useState<string | null>(null);

    const [newPurchase, setNewPurchase] = useState({
        liters: '',
        price_per_liter: '',
        purchase_date: new Date().toISOString().split('T')[0],
    });

    const [editingPurchase, setEditingPurchase] = useState<DieselPurchase | null>(null);
    const [deletingPurchase, setDeletingPurchase] = useState<DieselPurchase | null>(null);

    const fetchUserRole = useCallback(async () => {
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('roles(name)')
                .eq('id', user.id)
                .single();
            
            // --- FIX START ---
            // We cast the result to our new, more specific type.
            const typedProfile = profile as ProfileWithRole;
            const roleRelation = typedProfile?.roles;
            const roleName = Array.isArray(roleRelation) ? roleRelation[0]?.name : roleRelation?.name;
            setUserRole(roleName || null);
            // --- FIX END ---
        }
    }, [user, supabase]);

    const fetchPurchasesAndTotals = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { data: purchasesData, error: purchasesError } = await supabase
            .from('diesel_purchases')
            .select('*')
            .order('purchase_date', { ascending: false });

        if (purchasesError) {
            setError(purchasesError.message);
            setLoading(false);
            return;
        }

        setPurchases(purchasesData || []);
        const totalPurchased = (purchasesData || []).reduce((sum, p) => sum + p.liters, 0);

        const { data: refuelsData, error: refuelsError } = await supabase
            .from('refueler_logs')
            .select('liters_filled');

        if (refuelsError) {
            setError(refuelsError.message);
        }

        const totalRefueled = (refuelsData || []).reduce((sum, r) => sum + (r.liters_filled || 0), 0);
        setTotals({ purchased: totalPurchased, refueled: totalRefueled });
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchUserRole();
        fetchPurchasesAndTotals();
    }, [fetchUserRole, fetchPurchasesAndTotals]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (editingPurchase) {
            setEditingPurchase(prev => prev ? { ...prev, [name]: value } : null);
        } else {
            setNewPurchase((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleCreatePurchase = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setStatusMessage('Adding new purchase...');
        const liters = parseFloat(newPurchase.liters);
        const price_per_liter = parseFloat(newPurchase.price_per_liter);

        if (isNaN(liters) || liters <= 0) {
            setError('Please enter a valid number of liters.');
            setStatusMessage(null);
            return;
        }
        if (isNaN(price_per_liter) || price_per_liter <= 0) {
            setError('Please enter a valid price per liter.');
            setStatusMessage(null);
            return;
        }

        const { error: insertError } = await supabase.from('diesel_purchases').insert({
            liters, price_per_liter, purchase_date: newPurchase.purchase_date,
        });

        if (insertError) {
            setError(insertError.message);
            setStatusMessage(null);
        } else {
            setNewPurchase({ liters: '', price_per_liter: '', purchase_date: new Date().toISOString().split('T')[0] });
            await fetchPurchasesAndTotals();
            setStatusMessage('Successfully added new diesel purchase.');
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    const handleUpdatePurchase = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingPurchase) return;

        const liters = parseFloat(String(editingPurchase.liters));
        const price_per_liter = parseFloat(String(editingPurchase.price_per_liter));

        const { error: updateError } = await supabase.from('diesel_purchases').update({
            liters, price_per_liter, purchase_date: editingPurchase.purchase_date,
        }).eq('id', editingPurchase.id);

        if (updateError) {
            setError(updateError.message);
        } else {
            setEditingPurchase(null);
            await fetchPurchasesAndTotals();
            setStatusMessage('Purchase updated successfully.');
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    const handleDeletePurchase = async () => {
        if (!deletingPurchase) return;
        const { error: deleteError } = await supabase.from('diesel_purchases').delete().eq('id', deletingPurchase.id);

        if (deleteError) {
            setError(deleteError.message);
        } else {
            setDeletingPurchase(null);
            await fetchPurchasesAndTotals();
            setStatusMessage('Purchase deleted successfully.');
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };
    
    const isAdmin = userRole === 'SuperAdmin' || userRole === 'Admin';

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Diesel Purchases</h1>
            {error && <p className="text-red-600 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
            {statusMessage && <p className="text-green-600 bg-green-100 p-3 rounded-md mb-4">{statusMessage}</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-gray-800">Total Purchased</CardTitle><ArrowDown className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-gray-900">{totals.purchased.toLocaleString()} L</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-gray-800">Total Used (Refuels)</CardTitle><ArrowUp className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-gray-900">{totals.refueled.toLocaleString()} L</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-gray-800">Stock Remaining</CardTitle><BeakerIcon className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-gray-900">{(totals.purchased - totals.refueled).toLocaleString()} L</div></CardContent></Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 bg-white shadow-lg">
                    <CardHeader><CardTitle className="text-gray-900">Add New Purchase</CardTitle><CardDescription className="text-gray-600">Log a new bulk diesel purchase.</CardDescription></CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreatePurchase} className="space-y-4">
                            <div><Label htmlFor="purchase_date" className="text-gray-700 font-semibold">Purchase Date</Label><Input type="date" name="purchase_date" id="purchase_date" value={newPurchase.purchase_date} onChange={handleInputChange} className="bg-white text-black border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" required /></div>
                            <div><Label htmlFor="liters" className="text-gray-700 font-semibold">Liters</Label><Input type="number" name="liters" id="liters" value={newPurchase.liters} onChange={handleInputChange} className="bg-white text-black border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., 10000" required /></div>
                            <div><Label htmlFor="price_per_liter" className="text-gray-700 font-semibold">Price Per Liter (R)</Label><Input type="number" name="price_per_liter" id="price_per_liter" value={newPurchase.price_per_liter} onChange={handleInputChange} className="bg-white text-black border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., 20.00" step="0.01" required /></div>
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700"><PlusCircleIcon className="mr-2 h-4 w-4" />Add Purchase</Button>
                        </form>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2 bg-white shadow-lg">
                    <CardHeader><CardTitle className="text-gray-900">Purchase History</CardTitle><CardDescription className="text-gray-600">History of all bulk diesel purchases.</CardDescription></CardHeader>
                    <CardContent>
                        {loading ? (<p className="text-gray-600">Loading purchases...</p>) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead className="text-gray-800 font-bold">Date</TableHead><TableHead className="text-gray-800 font-bold">Liters</TableHead><TableHead className="text-gray-800 font-bold">Price/L</TableHead><TableHead className="text-gray-800 font-bold">Total Cost</TableHead>{isAdmin && <TableHead className="text-right text-gray-800 font-bold">Actions</TableHead>}</TableRow></TableHeader>
                                    <TableBody>
                                        {purchases.map((purchase) => (
                                            <TableRow key={purchase.id}>
                                                <TableCell className="font-medium text-gray-800">{new Date(purchase.purchase_date).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-gray-700">{purchase.liters} L</TableCell>
                                                <TableCell className="text-gray-700">R {Number(purchase.price_per_liter).toFixed(2)}</TableCell>
                                                <TableCell className="text-gray-700 font-semibold">R {(purchase.liters * purchase.price_per_liter).toFixed(2)}</TableCell>
                                                {isAdmin && (<TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setEditingPurchase(purchase)}><Pencil className="h-4 w-4 text-blue-600" /></Button><Button variant="ghost" size="icon" onClick={() => setDeletingPurchase(purchase)}><Trash2 className="h-4 w-4 text-red-600" /></Button></TableCell>)}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {editingPurchase && (
                <Dialog open={!!editingPurchase} onOpenChange={() => setEditingPurchase(null)}>
                    <DialogContent className="bg-white text-gray-900">
                        <DialogHeader><DialogTitle>Edit Diesel Purchase</DialogTitle></DialogHeader>
                        <form onSubmit={handleUpdatePurchase} className="space-y-4 pt-4">
                            <div><Label htmlFor="edit_purchase_date">Purchase Date</Label><Input id="edit_purchase_date" type="date" name="purchase_date" value={editingPurchase.purchase_date.split('T')[0]} onChange={handleInputChange} required /></div>
                            <div><Label htmlFor="edit_liters">Liters</Label><Input id="edit_liters" type="number" name="liters" value={editingPurchase.liters} onChange={handleInputChange} required /></div>
                            <div><Label htmlFor="edit_price_per_liter">Price Per Liter (R)</Label><Input id="edit_price_per_liter" type="number" name="price_per_liter" value={editingPurchase.price_per_liter} step="0.01" onChange={handleInputChange} required /></div>
                            <DialogFooter><Button type="button" variant="ghost" onClick={() => setEditingPurchase(null)}>Cancel</Button><Button type="submit">Save Changes</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {deletingPurchase && (
                <Dialog open={!!deletingPurchase} onOpenChange={() => setDeletingPurchase(null)}>
                    <DialogContent className="bg-white text-gray-900">
                        <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle><DialogDescription>Are you sure you want to delete this purchase record? This action cannot be undone.</DialogDescription></DialogHeader>
                        <DialogFooter><Button variant="ghost" onClick={() => setDeletingPurchase(null)}>Cancel</Button><Button variant="destructive" onClick={handleDeletePurchase}>Delete</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}