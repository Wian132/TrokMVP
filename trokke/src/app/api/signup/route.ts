import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const { email, password, fullName } = await request.json();
  const { data: userRes, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError || !userRes?.user) {
    return NextResponse.json({ error: userError?.message }, { status: 400 });
  }
  const userId = userRes.user.id;
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: userId,
    full_name: fullName,
    role: 'client',
  });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }
  const { error: clientError } = await supabaseAdmin.from('clients').insert({
    profile_id: userId,
  });
  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
