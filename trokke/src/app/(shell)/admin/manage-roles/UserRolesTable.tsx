// src/app/(shell)/admin/manage-roles/UserRolesTable.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Database } from '@/types/supabase';
import { UserWithProfileAndRole } from './page'; 
import { Toaster, toast } from 'sonner';

type Role = Database['public']['Tables']['roles']['Row'];

interface Props {
  initialUsers: UserWithProfileAndRole[];
  allRoles: Role[];
}

export default function UserRolesTable({ initialUsers, allRoles }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  const handleRoleChange = async (userId: string, newRoleName: string) => {
    if (!newRoleName) {
      toast.error("Please select a valid role.");
      return;
    }

    setLoading(prev => ({ ...prev, [userId]: true }));
    const newRole = allRoles.find(r => r.name === newRoleName);

    try {
      const { data, error } = await supabase.functions.invoke('update-user-role', {
        body: { userId, roleName: newRoleName },
      });

      if (error) {
        try {
          const errorBody = await error.context.json();
          throw new Error(errorBody.error || "An unknown function error occurred.");
        } catch { // ESLint warning fixed here
          throw new Error(error.message || "An unknown function error occurred.");
        }
      }
      
      if (newRole) {
        setUsers(users.map(u => 
          u.id === userId 
            ? { ...u, profile: { ...(u.profile || {}), full_name: u.profile?.full_name || 'N/A', roles: newRole } } 
            : u
        ));
      }
      toast.success(data.message || `Role updated to ${newRoleName}.`);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.profile?.full_name || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.profile?.roles?.name === 'SuperAdmin' ? (
                  <span className="px-3 py-1 font-semibold leading-tight text-red-700 bg-red-100 rounded-full">
                    SuperAdmin
                  </span>
                ) : (
                  <select
                    value={user.profile?.roles?.name || ''}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={loading[user.id]}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white text-black"
                  >
                    <option value="" disabled>Assign Role</option>
                    {allRoles
                      .filter(role => role.name !== 'SuperAdmin')
                      .map((role) => (
                        <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}