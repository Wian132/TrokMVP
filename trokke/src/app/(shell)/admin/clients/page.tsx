'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

// Define a more specific type for the data we fetch
type ClientProfile = {
  id: string; // This is the profile_id (UUID)
  full_name: string | null;
  contact_phone: string | null;
  clients: { company_name: string | null }[] | null;
};

type TransformedClient = {
  id: string;
  full_name: string;
  contact_phone: string | null;
  company_name: string | null;
}

export default function ClientsPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<TransformedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newClient, setNewClient] = useState({
    fullName: "",
    email: "",
    password: "",
    contactPhone: "",
    companyName: "",
  });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, contact_phone, clients ( company_name )")
      .eq("role", "client");

    if (error) {
      setError(error.message);
    } else {
      const transformedData = (data as ClientProfile[]).map(profile => ({
        id: profile.id,
        full_name: profile.full_name || '',
        contact_phone: profile.contact_phone || null,
        company_name: Array.isArray(profile.clients) && profile.clients.length > 0 ? profile.clients[0].company_name : null,
      }));
      setClients(transformedData);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewClient((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newClient.email,
      password: newClient.password,
    });

    if (authError || !authData.user) {
      setError(authError?.message || "Failed to create user.");
      return;
    }
    const userId = authData.user.id;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      full_name: newClient.fullName,
      contact_phone: newClient.contactPhone,
      role: 'client',
    });

    if (profileError) {
      setError(`Profile Error: ${profileError.message}`);
      return;
    }

    const { error: clientError } = await supabase.from("clients").insert({
      profile_id: userId,
      company_name: newClient.companyName,
    });

    if (clientError) {
      setError(`Client Entry Error: ${clientError.message}`);
      return;
    }

    await fetchClients();
    setNewClient({ fullName: "", email: "", password: "", contactPhone: "", companyName: "" });
  };

  if (loading) return <div className="p-6 font-bold text-gray-900">Loading clients...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Clients</h1>
      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Client</h2>
        <form onSubmit={handleCreateClient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" name="fullName" placeholder="Full Name" value={newClient.fullName} onChange={handleInputChange} required className="p-2 border rounded text-gray-900 placeholder-gray-600 font-semibold"/>
          <input type="email" name="email" placeholder="Email" value={newClient.email} onChange={handleInputChange} required className="p-2 border rounded text-gray-900 placeholder-gray-600 font-semibold"/>
          <input type="password" name="password" placeholder="Password" value={newClient.password} onChange={handleInputChange} required className="p-2 border rounded text-gray-900 placeholder-gray-600 font-semibold"/>
          <input type="text" name="contactPhone" placeholder="Contact Phone" value={newClient.contactPhone} onChange={handleInputChange} className="p-2 border rounded text-gray-900 placeholder-gray-600 font-semibold"/>
          <input type="text" name="companyName" placeholder="Company Name" value={newClient.companyName} onChange={handleInputChange} className="p-2 border rounded text-gray-900 placeholder-gray-600 font-semibold"/>
          <button type="submit" className="md:col-span-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-bold">Create Client</button>
        </form>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Current Clients</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Contact Phone</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.length > 0 ? (
                clients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">{client.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">{client.company_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">{client.contact_phone || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/clients/${client.id}`} className="text-indigo-600 hover:text-indigo-900 font-bold">View Details</Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500 font-bold">No clients found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
