import { createClient } from '@/utils/supabase/server';

type Truck = {
  id: number;
  license_plate: string;
  make: string | null;
  model: string | null;
  year: number | null;
  status: string;
};

export default async function MyTruckPage() {
  // We now MUST await the createClient() function call.
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>You must be logged in to see your assigned truck.</div>
  }

  const { data: worker, error: workerError } = await supabase
    .from('workers')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (workerError || !worker) {
      return <div>Could not find a worker profile for the current user.</div>
  }

  const { data: truck, error: truckError } = await supabase
    .from('trucks')
    .select('*')
    .eq('assigned_worker_id', worker.id)
    .single();

  if (truckError) {
    return <div className="text-orange-500">No truck is currently assigned to you.</div>;
  }

  const assignedTruck = truck as Truck;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Assigned Truck</h1>
      {assignedTruck ? (
        <div className="p-4 bg-white rounded-lg shadow">
            <p><span className="font-semibold">Vehicle:</span> {assignedTruck.make} {assignedTruck.model} ({assignedTruck.year})</p>
            <p><span className="font-semibold">License Plate:</span> {assignedTruck.license_plate}</p>
            <p><span className="font-semibold">Status:</span> <span className="font-medium capitalize">{assignedTruck.status}</span></p>
        </div>
      ) : (
        <p>No truck found.</p>
      )}
    </div>
  );
}
