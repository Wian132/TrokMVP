// src/app/(shell)/admin/my-shops/page.tsx
// This is now the Server Component file.

import { createClient } from '@/utils/supabase/server';
import MyShopsAdminPageClient from './MyShopsAdminPageClient'; // Import the new client component
import { type Database } from '@/types/supabase';

// Define the type for a Store
type BusinessStore = Database['public']['Tables']['business_stores']['Row'];

// This function fetches the initial data on the server
async function getStores() {
    // For a static page that still needs auth, we use the regular server client.
    // Next.js will handle the rendering context correctly here.
    const supabase = await createClient();
    try {
        const { data, error } = await supabase.from('business_stores').select('*');
        if (error) throw error;
        return { initialStores: data as BusinessStore[], error: null };
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
        return { initialStores: [], error: errorMessage };
    }
}

// The Page component passes server-fetched data to the client component
export default async function MyShopsAdminPage() {
    const { initialStores, error } = await getStores();

    if (error) {
        return <div className="p-6 text-red-500">Error loading data: {error}</div>;
    }

    return (
        <MyShopsAdminPageClient
            initialStores={initialStores}
        />
    );
}
