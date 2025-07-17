import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: NextRequest) {
  const { fullName, email, password } = await req.json()

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password
  })

  if (signUpError || !signUpData.user) {
    return NextResponse.json(
      { error: signUpError?.message || 'Failed to sign up' },
      { status: 400 }
    )
  }

  const userId = signUpData.user.id

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    full_name: fullName,
    role: 'client'
  })

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 400 }
    )
  }

  const { error: clientError } = await supabase.from('clients').insert({
    profile_id: userId
  })

  if (clientError) {
    return NextResponse.json(
      { error: clientError.message },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true })
}
