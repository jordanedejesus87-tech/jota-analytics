import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CommercialDashboard from '@/components/CommercialDashboard'
import { hojeSP } from '@/lib/comercial/metricas'
import type { Role } from '@/lib/types'
import type { VendaIndividual, LeadAberto } from '@/lib/comercial/origens'

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

  if (!profile || !['admin', 'system', 'commercial', 'client', 'externo'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Histórico desde agosto/2026 (início do controle)
  const leGestao = ['admin', 'system', 'client'].includes(profile.role)
  const leLeads = leGestao || profile.role === 'commercial'
  const vazio = Promise.resolve({ data: [] as never[] })

  const [
    { data: sales },
    { data: salespersonTargets },
    { data: teamTargets },
    { data: vendas },
    { data: leads },
    { data: ads },
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

    // Vendas individuais (com origem) — começaram em 29/10/2026
    supabase
      .from('vendas')
      .select('id, company_id, salesperson_name, sale_date, valor, origem, cliente, pedido, observacao, site_lead_id, canal_site, created_at')
      .eq('company_id', profile.company_id)
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20000),

    // Orçamentos do site em aberto, para vincular à venda (quem não tem acesso recebe lista vazia)
    leLeads
      ? supabase
          .from('site_leads')
          .select('id, created_at, nome, empresa, cidade, canal, status')
          .eq('company_id', profile.company_id)
          .in('status', ['novo', 'em_atendimento', 'orcado'])
          .gte('created_at', new Date(Date.now() - 120 * 864e5).toISOString())
          .order('created_at', { ascending: false })
          .limit(300)
      : vazio,

    // Investimento no Google Ads por dia (só gestão enxerga)
    leGestao
      ? supabase.from('ads_diario').select('data, custo').eq('company_id', profile.company_id).gte('data', '2026-08-01').limit(20000)
      : vazio,
  ])

  const custoAds: Record<string, number> = {}
  for (const a of (ads ?? []) as { data: string; custo: number }[]) custoAds[a.data] = (custoAds[a.data] ?? 0) + Number(a.custo || 0)

  return (
    <CommercialDashboard
      initialSales={sales ?? []}
      companyId={profile.company_id}
      currentUserName={profile.name}
      currentUserRole={profile.role as Role}
      salespersonTargets={salespersonTargets ?? []}
      teamTargets={teamTargets ?? []}
      hoje={hojeSP()}
      initialVendas={((vendas ?? []) as VendaIndividual[]).map((v) => ({ ...v, valor: Number(v.valor) }))}
      leadsAbertos={(leads ?? []) as LeadAberto[]}
      custoAds={leGestao ? custoAds : null}
    />
  )
}
