"use client";
import { supabase } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../../components/AuthContext";
import { useEffect, useState } from "react";

interface ClientStore {
  id: number;
  name: string;
  address: string | null;
}

const MyStoresPage = () => {
  const { session } = useAuth();
  const [stores, setStores] = useState<ClientStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = session?.user;
    if (!user) {
        setLoading(false);
        return;
    }

    const fetchClientStores = async () => {
      setLoading(true);

      // First, get the client ID from the 'clients' table using the user's profile_id
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (clientError || !clientData) {
        console.error("Error fetching client profile:", clientError?.message);
        setLoading(false);
        return;
      }

      // Then, fetch the stores associated with that client ID
      const { data: storesData, error: storesError } = await supabase
        .from("client_stores")
        .select("id, name, address")
        .eq("client_id", clientData.id);

      if (storesError) {
        console.error("Error fetching stores:", storesError.message);
      } else {
        setStores(storesData || []);
      }

      setLoading(false);
    };

    fetchClientStores();
  }, [session]); // Depend on the session object

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-800">Loading your stores...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">
          My Stores
        </h1>
        {stores.length > 0 ? (
          <div className="space-y-4">
            {stores.map((store) => (
              <div key={store.id} className="p-4 border rounded-lg bg-gray-50">
                <h2 className="font-bold text-lg text-gray-900">{store.name}</h2>
                <p className="text-sm text-gray-600">{store.address || "No address provided"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">You have not been assigned any stores yet.</p>
        )}
      </div>
    </div>
  );
};

export default MyStoresPage;
