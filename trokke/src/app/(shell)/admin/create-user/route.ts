import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { email, password, role, fullName, contactPhone, companyName } = await request.json();

  // Ensure you have these environment variables set in your .env.local file
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: 'Supabase URL or Service Role Key is not configured.' },
      { status: 500 }
    );
  }

  // Create the Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Create the user in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Automatically confirm the email
    user_metadata: {
      role, // This will be 'worker' or 'client'
      full_name: fullName,
      contact_phone: contactPhone,
      // Pass the companyName for the trigger to use if the role is 'client'
      companyName: companyName,
    },
  });

  if (authError) {
    console.error('Error creating user in Supabase Auth:', authError);
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // The database trigger you created (`handle_new_user`) will now execute,
  // creating the corresponding profile and worker/client record.

  return NextResponse.json({ success: true, user: authData.user });
}
