import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CommercialDashboard from '@/components/CommercialDashboard'

export default async function ComercialPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, name')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'commercial'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Buscar todos os dados de Ago/Set/Out 2026
  const [
    { data: sales },
    { data: salespersonTargets },
    { data: teamTargets },
  ] = await Promise.all([
    supabase
      .from('daily_sales')
      .select('*')
      .eq('company_id', profile.company_id)
      .gte('sale_date', '2026-08-01')
      .lte('sale_date', '2026-10-31')
      .order('sale_date', { ascending: false }),

    supabase
      .from('salesperson_targets')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('year', 2026)
      .in('month', [8, 9, 10]),

    supabase
      .from('team_targets')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('year', 2026)
      .in('month', [8, 9, 10]),
  ])

  return (
    <CommercialDashboard
      initialSales={sales ?? []}
      companyId={profile.company_id}
      currentUserName={profile.name}
      currentUserRole={profile.role as 'admin' | 'client' | 'commercial'}
      salespersonTargets={salespersonTargets ?? []}
      teamTargets={teamTargets ?? []}
    />
  )
}
