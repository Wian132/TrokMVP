'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { type Database } from '@/types/supabase';
import { UserWithProfile } from './page';
import { UserPlusIcon, PencilIcon, TrashIcon, TruckIcon, KeyIcon } from '@heroicons/react/24/outline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from 'sonner';

// --- Type Definitions ---
type Truck = Database['public']['Tables']['trucks']['Row'];
type Role = Database['public']['Tables']['roles']['Row'];

interface WorkersClientProps {
  initialUsers: UserWithProfile[];
  initialTrucks: Truck[];
  initialRoles: Role[];
}

export default function WorkersClient({ initialUsers, initialTrucks, initialRoles }: WorkersClientProps) {
  const supabase = createClient();
  const [users, setUsers] = useState<UserWithProfile[]>(initialUsers);
  const [trucks] = useState<Truck[]>(initialTrucks);
  const [roles] = useState<Role[]>(initialRoles);

  // State for modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);

  // State for form data
  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    password: "",
    contactPhone: "",
    role: "Worker", // Default role
  });
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithProfile | null>(null);
  const [assigningUser, setAssigningUser] = useState<UserWithProfile | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<UserWithProfile | null>(null);
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (isEditModalOpen && editingUser && editingUser.profile) {
        setEditingUser(prev => {
            if (!prev || !prev.profile) return null;
            const updatedProfile = { ...prev.profile, [name]: value };
            return { ...prev, profile: updatedProfile };
        });
    } else if (isCreateModalOpen) {
        setNewUser((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRoleChange = (roleName: string) => {
    setNewUser(prev => ({...prev, role: roleName}));
  }

  // --- CRUD Handlers ---
  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const response = await fetch('/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newUser.email, 
        password: newUser.password, 
        role: newUser.role,
        fullName: newUser.fullName, 
        contactPhone: newUser.contactPhone,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || 'An unknown error occurred.');
    } else {
      toast.success('User created successfully.');
      // For simplicity, we can just reload the page to see the new user
      window.location.reload();
      closeCreateModal();
    }
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser || !editingUser.profile) return;
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: editingUser.profile.full_name, contact_phone: editingUser.profile.contact_phone })
      .eq('id', editingUser.id);
    if (profileError) {
        toast.error(profileError.message);
    } else {
        toast.success('User updated successfully.');
        setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
        closeEditModal();
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    const { error: functionError } = await supabase.functions.invoke('delete-user', {
        body: { userId: deletingUser.id },
    });
    if (functionError) {
        toast.error(`Failed to delete user: ${functionError.message}.`);
    } else {
      toast.success('User deleted successfully.');
      setUsers(users.filter(u => u.id !== deletingUser.id));
    }
    closeDeleteModal();
  };

  const handleAssignTruck = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assigningUser || !selectedTruckId) {
      toast.error("Please select a user and a truck.");
      return;
    }
    const { error: truckUpdateError } = await supabase
        .from('trucks')
        .update({ primary_driver_id: assigningUser.profile?.workers?.id ?? null })
        .eq('id', selectedTruckId);
    if (truckUpdateError) {
        toast.error(`Failed to assign truck: ${truckUpdateError.message}`);
    } else {
        toast.success('Truck assigned successfully.');
        // For simplicity, we can just reload the page to see the new assignment
        window.location.reload();
        closeAssignModal();
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resettingPasswordUser || !newPassword) {
      toast.error("Please enter a new password.");
      return;
    }
    const response = await fetch('/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: resettingPasswordUser.id, newPassword }),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || 'An unknown error occurred.');
    } else {
      toast.success('Password reset successfully.');
      closeResetPasswordModal();
    }
  };

  const handleRoleUpdate = async (userId: string, newRoleName: string) => {
    const { data, error } = await supabase.functions.invoke('update-user-role', {
        body: { userId, roleName: newRoleName },
    });
    if (error) {
        toast.error(`Failed to update role: ${error.message}`);
    } else {
        toast.success(data.message || `Role updated to ${newRoleName}.`);
        // Update local state to reflect the change immediately
        setUsers(users.map(u => {
            if (u.id === userId && u.profile) {
                const newRole = roles.find(r => r.name === newRoleName);
                if (newRole) {
                    return { ...u, profile: { ...u.profile, roles: newRole }};
                }
            }
            return u;
        }));
    }
  };

  // --- Modal Control Functions ---
  const openCreateModal = () => {
    setNewUser({ fullName: "", email: "", password: "", contactPhone: "", role: "Worker" });
    setIsCreateModalOpen(true);
  };
  const closeCreateModal = () => setIsCreateModalOpen(false);

  const openEditModal = (user: UserWithProfile) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => setIsEditModalOpen(false);

  const openDeleteModal = (user: UserWithProfile) => {
    setDeletingUser(user);
    setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => setIsDeleteModalOpen(false);

  const openAssignModal = (user: UserWithProfile) => {
    setAssigningUser(user);
    setSelectedTruckId('');
    setIsAssignModalOpen(true);
  };
  const closeAssignModal = () => setIsAssignModalOpen(false);

  const openResetPasswordModal = (user: UserWithProfile) => {
    setResettingPasswordUser(user);
    setNewPassword('');
    setIsResetPasswordModalOpen(true);
  };
  const closeResetPasswordModal = () => setIsResetPasswordModalOpen(false);

  return (
    <div className="p-6">
      <Toaster richColors position="top-center" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Users & Roles</h1>
        <button onClick={openCreateModal} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-bold">
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Add User
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Name & Email</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Assigned Truck(s)</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length > 0 ? (
                users.map((user) => {
                    const activeTrucks = user.profile?.workers?.active_trucks?.map(t => t.license_plate).join(', ') || '';
                    const primaryTrucks = user.profile?.workers?.primary_trucks?.map(t => t.license_plate).join(', ') || '';
                  return (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-800">{user.profile?.full_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-600">
                      {user.profile?.roles?.name === 'SuperAdmin' ? (
                        <span className="px-3 py-1 font-semibold leading-tight text-red-700 bg-red-100 rounded-full">
                          SuperAdmin
                        </span>
                      ) : (
                        <Select value={user.profile?.roles?.name || ''} onValueChange={(newRole) => handleRoleUpdate(user.id, newRole)}>
                          <SelectTrigger className="w-[180px] bg-white text-black">
                              <SelectValue placeholder="Assign Role" />
                          </SelectTrigger>
                          <SelectContent className="bg-white text-black">
                              {roles.map(role => (
                                  <SelectItem key={role.id} value={role.name}>
                                      {role.name}
                                  </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {activeTrucks && <div><span className="font-bold">Active:</span> {activeTrucks}</div>}
                      {primaryTrucks && <div><span className="font-bold">Primary:</span> {primaryTrucks}</div>}
                      {(!activeTrucks && !primaryTrucks && user.profile?.workers) && <span className="text-gray-400">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        {user.profile?.workers && (
                            <button
                            onClick={() => openAssignModal(user)}
                            className="p-2 rounded-full text-green-600 hover:text-green-900 hover:bg-green-100"
                            title="Assign Primary Truck"
                            >
                                <TruckIcon className="h-5 w-5" />
                            </button>
                        )}
                        <button
                          onClick={() => openResetPasswordModal(user)}
                          className="p-2 rounded-full text-yellow-600 hover:text-yellow-900 hover:bg-yellow-100"
                          title="Reset Password"
                        >
                            <KeyIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => openEditModal(user)} className="p-2 text-indigo-600 hover:text-indigo-900 rounded-full hover:bg-indigo-100" title="Edit User">
                            <PencilIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => openDeleteModal(user)} className="p-2 text-red-600 hover:text-red-900 rounded-full hover:bg-red-100" title="Delete User">
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </td>
                  </tr>
                )})
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500 font-bold">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* --- Modals --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Add New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <input type="text" name="fullName" placeholder="Full Name" value={newUser.fullName} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <input type="email" name="email" placeholder="Email" value={newUser.email} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <input type="password" name="password" placeholder="Password" value={newUser.password} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <input type="text" name="contactPhone" placeholder="Contact Phone" value={newUser.contactPhone} onChange={handleInputChange} className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                <Select name="role" required value={newUser.role} onValueChange={handleRoleChange}>
                    <SelectTrigger className="w-full bg-white text-black">
                        <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                        {roles.map(role => (
                            <SelectItem key={role.id} value={role.name}>
                                {role.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={closeCreateModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Edit User</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <input type="text" name="full_name" placeholder="Full Name" value={editingUser.profile?.full_name || ''} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <input type="text" name="contact_phone" placeholder="Contact Phone" value={editingUser.profile?.contact_phone || ''} onChange={handleInputChange} className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={closeEditModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && deletingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Confirm Deletion</h2>
            <p className="text-gray-700">Are you sure you want to delete the user <span className="font-bold text-gray-900">{deletingUser.profile?.full_name}</span>? This action is irreversible.</p>
            <div className="flex justify-end space-x-4 mt-6">
                <button type="button" onClick={closeDeleteModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
                <button onClick={handleDeleteUser} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {isAssignModalOpen && assigningUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-gray-900">Assign Primary Truck to {assigningUser.profile?.full_name}</h2>
                <form onSubmit={handleAssignTruck} className="space-y-4">
                    <select
                        name="truckId"
                        value={selectedTruckId}
                        onChange={(e) => setSelectedTruckId(e.target.value)}
                        required
                        className="w-full p-2 border rounded font-semibold text-gray-900"
                    >
                        <option value="" disabled>Select an available truck</option>
                        {trucks.map(truck => (
                            <option key={truck.id} value={truck.id}>
                                {truck.license_plate} ({truck.make} {truck.model})
                            </option>
                        ))}
                    </select>
                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={closeAssignModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Assign Truck</button>
                    </div>
                </form>
            </div>
        </div>
      )}

        {isResetPasswordModalOpen && resettingPasswordUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Reset Password for {resettingPasswordUser.profile?.full_name}</h2>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <input
                            type="password"
                            placeholder="Enter new temporary password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"
                        />
                        <div className="flex justify-end space-x-4">
                            <button type="button" onClick={closeResetPasswordModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700">Reset Password</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}