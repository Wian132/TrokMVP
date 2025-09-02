import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';


export default async function MyTruckPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: worker } = await supabase
    .from('workers')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (!worker) {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">My Assigned Truck</h1>
            <div className="p-6 bg-white rounded-lg shadow">
                <p className="text-lg text-gray-700">Could not find a worker profile for your account.</p>
            </div>
        </div>
    );
  }

  // FIX: Query for truck using 'primary_driver_id' first, then 'active_driver_id'
  let { data: truck } = await supabase
    .from('trucks')
    .select('*')
    .eq('primary_driver_id', worker.id)
    .single();

  if (!truck) {
    // If not a primary driver of any truck, check if they are an active driver
    const { data: active_truck } = await supabase
        .from('trucks')
        .select('*')
        .eq('active_driver_id', worker.id)
        .single();
    truck = active_truck;
  }


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">My Assigned Truck</h1>
      <div className="p-6 bg-white rounded-lg shadow">
        {truck ? (
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-500">Vehicle</label>
                    <p className="text-xl font-bold text-black">{truck.make} {truck.model} ({truck.year})</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-500">License Plate</label>
                    <p className="text-xl font-bold text-black">{truck.license_plate}</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="text-xl font-bold text-black capitalize">{truck.status}</p>
                </div>
            </div>
        ) : (
            <p className="text-lg text-orange-500 font-semibold">No truck is currently assigned to you.</p>
        )}
      </div>
    </div>
  );
}
