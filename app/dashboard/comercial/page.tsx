import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CommercialDashboard from '@/components/CommercialDashboard'
import { hojeSP } from '@/lib/comercial/metricas'
import type { Role } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ComercialPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, name')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'system', 'commercial', 'client'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Histórico desde agosto/2026 (início do controle)
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
      .limit(20000)
      .order('sale_date', { ascending: false }),

    supabase
      .from('salesperson_targets')
      .select('*')
      .eq('company_id', profile.company_id)
      .gte('year', 2026),

    supabase
      .from('team_targets')
      .select('*')
      .eq('company_id', profile.company_id)
      .gte('year', 2026),
  ])

  return (
    <CommercialDashboard
      initialSales={sales ?? []}
      companyId={profile.company_id}
      currentUserName={profile.name}
      currentUserRole={profile.role as Role}
      salespersonTargets={salespersonTargets ?? []}
      teamTargets={teamTargets ?? []}
      hoje={hojeSP()}
    />
  )
}
