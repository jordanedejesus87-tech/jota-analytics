import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const COMPANY_ID = '64b833c2-e99d-43fc-9e79-2d6d882858e7'

const NEW_USERS = [
  { email: 'bruna@laescmalhas.com', name: 'Bruna' },
  { email: 'evandro@laescmalhas.com', name: 'Evandro' },
  { email: 'geronimo@laescmalhas.com', name: 'Gerônimo' },
  { email: 'jessica@laescmalhas.com', name: 'Jéssica' },
]

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const createResults = []
  for (const u of NEW_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: 'Laesc@2026',
      email_confirm: true,
      user_metadata: { name: u.name },
    })
    const userId = data?.user?.id
    createResults.push({ email: u.email, id: userId, error: error?.message })

    if (userId) {
      const { error: profileError } = await supabase.from('profiles').upsert(
        { id: userId, company_id: COMPANY_ID, name: u.name, role: 'commercial' },
        { onConflict: 'id' }
      )
      if (profileError) {
        createResults[createResults.length - 1].profileError = profileError.message
      }
    }
  }

  return NextResponse.json({ ok: true, companyId: COMPANY_ID, createResults })
}
