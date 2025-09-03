import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import UserRolesTable from './UserRolesTable';
import { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type UserWithProfileAndRole = User & {
  profile: {
    full_name: string | null;
    roles: {
      id: number;
      name: string;
    } | null;
  } | null; 
};

async function getRolesAndUsers() {
  const supabase = await createClient(); // Standard client for session check
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Use the ADMIN client for all privileged data fetching
  const { data, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  
  // FIX: First, check for an error from the listUsers call.
  if (usersError) {
    console.error("Fatal error fetching users:", usersError);
    // Return empty arrays to prevent the page from crashing.
    return { users: [], roles: [] };
  }
  // If there's no error, we can safely access the users list.
  const users = data.users;
  
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select(`id, full_name, roles (*)`);

  const { data: roles, error: rolesError } = await supabaseAdmin
    .from('roles')
    .select('*');

  if (profilesError || rolesError) {
    console.error("Fatal error fetching profiles or roles:", profilesError || rolesError);
    return { users: [], roles: [] };
  }
  
  const profilesMap = new Map(profiles.map(p => [p.id, p]));

  const usersWithProfiles = users.map((user: User) => ({
    ...user,
    profile: profilesMap.get(user.id) || null, 
  })) as UserWithProfileAndRole[];

  return { users: usersWithProfiles, roles: roles || [] };
}


export default async function ManageRolesPage() {
  const { users, roles } = await getRolesAndUsers();

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Manage User Roles</h1>
      <div className="p-6 bg-white rounded-lg shadow-md overflow-x-auto">
        <UserRolesTable initialUsers={users} allRoles={roles} />
      </div>
    </main>
  );
}