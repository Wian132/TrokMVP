'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { type Database } from '@/types/supabase';
import { UserPlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Define a more specific type for the data we fetch, including the nested company_name
type ClientWithCompany = Database['public']['Tables']['profiles']['Row'] & {
  clients: { company_name: string | null }[] | null;
};

// Define a simpler type for our state to make it easier to work with
type ClientState = {
  id: string;
  full_name: string | null;
  contact_phone: string | null;
  company_name: string | null;
};

export default function ClientsPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<ClientState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // State for form data
  const [newClient, setNewClient] = useState({
    fullName: "",
    email: "",
    password: "",
    contactPhone: "",
    companyName: "",
  });
  const [editingClient, setEditingClient] = useState<ClientState | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientState | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*, clients ( company_name )")
      .eq("role", "client");

    if (error) {
      setError(error.message);
    } else {
      // Transform the data to our simpler ClientState type
      const transformedData = (data as ClientWithCompany[]).map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        contact_phone: profile.contact_phone,
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
    if (isEditModalOpen && editingClient) {
        setEditingClient({ ...editingClient, [name]: value });
    } else {
        setNewClient((prev) => ({ ...prev, [name]: value }));
    }
  };

  // --- CRUD Handlers ---

  const handleCreateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Create the user in Supabase Auth, passing all data in the metadata
    const { error: authError } = await supabase.auth.signUp({
      email: newClient.email,
      password: newClient.password,
      options: {
        data: {
          role: 'client',
          full_name: newClient.fullName,
          contact_phone: newClient.contactPhone,
          company_name: newClient.companyName,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    await fetchClients();
    closeCreateModal();
  };
  
  const handleUpdateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingClient) return;

    // We need to update two tables in parallel
    const [profileUpdate, clientUpdate] = await Promise.all([
        supabase
            .from('profiles')
            .update({
                full_name: editingClient.full_name,
                contact_phone: editingClient.contact_phone,
            })
            .eq('id', editingClient.id),
        supabase
            .from('clients')
            .update({ company_name: editingClient.company_name })
            .eq('profile_id', editingClient.id)
    ]);

    if (profileUpdate.error || clientUpdate.error) {
        setError(profileUpdate.error?.message || clientUpdate.error?.message || "An error occurred.");
    } else {
        await fetchClients();
        closeEditModal();
    }
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;

    // Delete profile (which should cascade to 'clients' table)
    const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingClient.id);

    if (profileError) {
        setError(`Failed to delete profile: ${profileError.message}`);
        closeDeleteModal();
        return;
    }

    // Call Edge Function to delete from auth
    const { error: functionError } = await supabase.functions.invoke('delete-user', {
        body: { userId: deletingClient.id },
    });

    if (functionError) {
        setError(`Failed to delete auth user: ${functionError.message}. Please do it manually.`);
    }

    await fetchClients();
    closeDeleteModal();
  };

  // --- Modal Control Functions ---
  const openCreateModal = () => {
    setNewClient({ fullName: "", email: "", password: "", contactPhone: "", companyName: "" });
    setIsCreateModalOpen(true);
  };
  const closeCreateModal = () => setIsCreateModalOpen(false);

  const openEditModal = (client: ClientState) => {
    setEditingClient(client);
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => setIsEditModalOpen(false);

  const openDeleteModal = (client: ClientState) => {
    setDeletingClient(client);
    setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => setIsDeleteModalOpen(false);


  if (loading) return <div className="p-6 font-bold text-center">Loading clients...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Clients</h1>
        <button onClick={openCreateModal} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-bold">
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Add Client
        </button>
      </div>
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Contact Phone</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.length > 0 ? (
                clients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">{client.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-600">{client.company_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-600">{client.contact_phone || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button onClick={() => openEditModal(client)} className="p-2 text-indigo-600 hover:text-indigo-900 rounded-full hover:bg-indigo-100"><PencilIcon className="h-5 w-5" /></button>
                        <button onClick={() => openDeleteModal(client)} className="p-2 text-red-600 hover:text-red-900 rounded-full hover:bg-red-100"><TrashIcon className="h-5 w-5" /></button>
                        <Link href={`/admin/clients/${client.id}`} className="inline-block p-2 text-blue-600 hover:text-blue-900 rounded-full hover:bg-blue-100 font-bold">View Stores</Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500 font-bold">No clients found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* --- Modals --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Add New Client</h2>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <input type="text" name="fullName" placeholder="Full Name" value={newClient.fullName} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900"/>
              <input type="email" name="email" placeholder="Email" value={newClient.email} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900"/>
              <input type="password" name="password" placeholder="Password" value={newClient.password} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900"/>
              <input type="text" name="contactPhone" placeholder="Contact Phone" value={newClient.contactPhone} onChange={handleInputChange} className="w-full p-2 border rounded font-semibold text-gray-900"/>
              <input type="text" name="companyName" placeholder="Company Name" value={newClient.companyName} onChange={handleInputChange} className="w-full p-2 border rounded font-semibold text-gray-900"/>
              <div className="flex justify-end space-x-4"><button type="button" onClick={closeCreateModal} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Create</button></div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Client</h2>
            <form onSubmit={handleUpdateClient} className="space-y-4">
              <input type="text" name="full_name" placeholder="Full Name" value={editingClient.full_name || ''} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900"/>
              <input type="text" name="contact_phone" placeholder="Contact Phone" value={editingClient.contact_phone || ''} onChange={handleInputChange} className="w-full p-2 border rounded font-semibold text-gray-900"/>
              <input type="text" name="company_name" placeholder="Company Name" value={editingClient.company_name || ''} onChange={handleInputChange} className="w-full p-2 border rounded font-semibold text-gray-900"/>
              <div className="flex justify-end space-x-4"><button type="button" onClick={closeEditModal} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Save Changes</button></div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && deletingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Confirm Deletion</h2>
            <p className="text-gray-700">Are you sure you want to delete <span className="font-bold text-gray-900">{deletingClient.full_name}</span>? This is irreversible.</p>
            <div className="flex justify-end space-x-4 mt-6"><button type="button" onClick={closeDeleteModal} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button><button onClick={handleDeleteClient} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
