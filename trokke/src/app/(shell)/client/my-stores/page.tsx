import { createClient } from '@/utils/supabase/server';

type ClientStore = {
    id: number;
    name: string;
    address: string | null;
};

export default async function MyStoresPage() {
  // The createClient function for the server is now async, so we must await it.
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>You must be logged in to see your stores.</div>;
  }
  
  const { data: clientRecord, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (clientError || !clientRecord) {
      return <div>Could not find a client profile for the current user.</div>
  }

  const { data: stores, error: storesError } = await supabase
    .from('client_stores')
    .select('*')
    .eq('client_id', clientRecord.id);

  if (storesError) {
    return <div className="text-red-500">Error loading stores: {storesError.message}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Stores</h1>
       <div className="bg-white shadow rounded-lg">
        <ul className="divide-y divide-gray-200">
          {(stores as ClientStore[])?.map((store) => (
            <li key={store.id} className="p-4">
              <p className="font-semibold">{store.name}</p>
              <p className="text-sm text-gray-600">{store.address || 'No address provided'}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
