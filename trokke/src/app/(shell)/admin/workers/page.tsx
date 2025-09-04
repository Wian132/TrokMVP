import { supabaseAdmin } from '@/lib/supabase-admin';
import WorkersClient from './WorkersClient'; // We will create this component next
import { User } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';

// --- Type Definitions ---
type ProfileInfo = Database['public']['Tables']['profiles']['Row'] & {
  roles: Database['public']['Tables']['roles']['Row'] | null;
  workers: (Database['public']['Tables']['workers']['Row'] & {
    active_trucks: { license_plate: string }[];
    primary_trucks: { license_plate: string }[];
  }) | null;
};

export type UserWithProfile = User & {
  profile: ProfileInfo | null;
};

async function getData() {
  // Use the ADMIN client for all privileged data fetching
  const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) throw new Error(authError.message);

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select(`
      *,
      roles(*),
      workers!left(*,
        active_trucks:trucks!active_driver_id(license_plate),
        primary_trucks:trucks!primary_driver_id(license_plate)
      )
    `);
  if (profilesError) throw new Error(profilesError.message);

  const trucksPromise = supabaseAdmin.from('trucks').select('*');
  const rolesPromise = supabaseAdmin.from('roles').select('*').not('name', 'in', '("Client")');
    
  const [trucksResult, rolesResult] = await Promise.all([trucksPromise, rolesPromise]);
  if (trucksResult.error) throw new Error(trucksResult.error.message);
  if (rolesResult.error) throw new Error(rolesResult.error.message);

  // Combine Auth users with their profiles
  const profilesMap = new Map(profiles.map(p => [p.id, p]));
  const combinedUsers = users
    .map((user: User) => ({
      ...user,
      profile: profilesMap.get(user.id) || null,
    }))
    .filter((u: UserWithProfile) => u.profile && u.profile.roles?.name !== 'Client') as UserWithProfile[];

  return {
    users: combinedUsers,
    trucks: trucksResult.data || [],
    roles: rolesResult.data || [],
  };
}

export default async function WorkersPage() {
  const { users, trucks, roles } = await getData();

  return (
    <WorkersClient
      initialUsers={users}
      initialTrucks={trucks}
      initialRoles={roles}
    />
  );
}