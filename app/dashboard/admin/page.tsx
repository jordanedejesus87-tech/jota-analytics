import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminPanel from '@/components/AdminPanel'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Buscar dados para o painel admin
  const [
    { data: companies },
    { data: profiles },
    { data: snapshots },
  ] = await Promise.all([
    supabase.from('companies').select('*').order('name'),
    supabase.from('profiles').select('*, company:companies(name)').order('name'),
    supabase.from('dfc_snapshots').select('id, company_id, year, period_label, created_at, company:companies(name)').order('created_at', { ascending: false }),
  ])

  return (
    <AdminPanel
      companies={companies ?? []}
      profiles={profiles ?? []}
      snapshots={snapshots ?? []}
    />
  )
}
