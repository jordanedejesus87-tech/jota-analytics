import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LeadsCRM from '@/components/leads/LeadsCRM'
import { hojeSP, resolverPeriodo, somarDias } from '@/lib/externo/metricas'
import { CAMPOS_LEAD, PAPEIS_VEEM_TEMPO, type LeadCRM } from '@/lib/leads/crm'

export const dynamic = 'force-dynamic'

const PAPEIS = ['admin', 'system', 'client', 'commercial']

export default async function LeadsPage({ searchParams }: { searchParams: { p?: string; de?: string; ate?: string; lead?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('id, role, company_id, name').eq('id', user.id).single()
  if (!profile || !PAPEIS.includes(profile.role)) redirect('/dashboard')

  const hoje = hojeSP()
  const periodo = resolverPeriodo({ ...searchParams, p: searchParams.p || (searchParams.de ? undefined : '30d') }, hoje, '2026-08-01')

  // Abertos: todos (independente do período). Métricas: os que chegaram no período.
  const [abertos, doPeriodo, equipe] = await Promise.all([
    supabase.from('site_leads').select(CAMPOS_LEAD).eq('company_id', profile.company_id)
      .in('status', ['novo', 'em_atendimento', 'orcado']).order('created_at', { ascending: true }).limit(2000),
    supabase.from('site_leads').select(CAMPOS_LEAD).eq('company_id', profile.company_id)
      .gte('created_at', somarDias(periodo.de, -1)).lte('created_at', somarDias(periodo.ate, 1) + 'T23:59:59')
      .order('created_at', { ascending: false }).limit(5000),
    supabase.from('profiles').select('id, name').eq('company_id', profile.company_id).in('role', ['commercial', 'client', 'admin']),
  ])

  return (
    <LeadsCRM
      abertos={(abertos.data ?? []) as LeadCRM[]}
      doPeriodo={(doPeriodo.data ?? []) as LeadCRM[]}
      periodo={periodo}
      hoje={hoje}
      equipe={equipe.data ?? []}
      podeEditar={profile.role !== 'client'}
      verTempos={PAPEIS_VEEM_TEMPO.includes(profile.role)}
      destaque={searchParams.lead}
      erro={abertos.error?.message || doPeriodo.error?.message || null}
    />
  )
}
