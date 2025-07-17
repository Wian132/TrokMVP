"use client";
import { supabase } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../../components/AuthContext";
import { useEffect, useState } from "react";

interface Truck {
  id: number;
  license_plate: string;
  make: string | null;
  model: string | null;
  year: number | null;
}

const MyTruckPage = () => {
  const { session } = useAuth();
  const [truck, setTruck] = useState<Truck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = session?.user;
    if (!user) {
        setLoading(false);
        return;
    };

    const fetchWorkerTruck = async () => {
      setLoading(true);

      // First, get the worker ID from the 'workers' table using the user's profile_id
      const { data: workerData, error: workerError } = await supabase
        .from("workers")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (workerError || !workerData) {
        console.error("Error fetching worker profile:", workerError?.message);
        setLoading(false);
        return;
      }

      // Then, fetch the truck assigned to that worker ID
      const { data: truckData, error: truckError } = await supabase
        .from("trucks")
        .select("*")
        .eq("assigned_worker_id", workerData.id)
        .single(); // Assuming one worker is assigned to one truck

      if (truckError) {
        // It's common for a worker not to have a truck, so we don't log this as a critical error
        console.log("Info: No truck assigned to this worker.");
        setTruck(null);
      } else {
        setTruck(truckData);
      }

      setLoading(false);
    };

    fetchWorkerTruck();
  }, [session]); // Depend on the session object

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-800">Loading your truck details...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">
          My Assigned Truck
        </h1>
        {truck ? (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h2 className="font-bold text-2xl text-gray-900">{truck.license_plate}</h2>
            <p className="text-lg text-gray-600 mt-2">
              {truck.year} {truck.make} {truck.model}
            </p>
          </div>
        ) : (
          <p className="text-gray-600">You have not been assigned a truck yet.</p>
        )}
      </div>
    </div>
  );
};

export default MyTruckPage;
