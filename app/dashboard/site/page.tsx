import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SitePainel from '@/components/site/SitePainel'
import { hojeSP, resolverPeriodo, somarDias } from '@/lib/externo/metricas'
import type { AdsDia, AdsTermo, SiteLead } from '@/lib/site/metricas'

export const dynamic = 'force-dynamic'

const PAPEIS = ['admin', 'system', 'client']

export default async function SitePage({ searchParams }: { searchParams: { p?: string; de?: string; ate?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role, company_id, name').eq('id', user.id).single()
  if (!profile || !PAPEIS.includes(profile.role)) redirect('/dashboard')

  const hoje = hojeSP()
  const periodo = resolverPeriodo({ ...searchParams, p: searchParams.p || (searchParams.de ? undefined : '30d') }, hoje, '2026-08-01')
  const empresa = profile.company_id

  // Leads são gravados com horário UTC; amplia um dia para cada lado e filtra no fuso de São Paulo depois.
  const ini = somarDias(periodo.antDe, -1), fim = somarDias(periodo.ate, 1)

  const [ads, termos, leads, envio] = await Promise.all([
    supabase.from('ads_diario').select('data, campanha_id, campanha, status, impressoes, cliques, custo, conversoes, conv_whatsapp, conv_orcamento')
      .eq('company_id', empresa).gte('data', periodo.antDe).lte('data', periodo.ate).limit(10000),
    supabase.from('ads_termos').select('data, campanha, termo, impressoes, cliques, custo, conversoes')
      .eq('company_id', empresa).gte('data', periodo.de).lte('data', periodo.ate).limit(10000),
    supabase.from('site_leads').select('id, created_at, nome, cidade, empresa, produtos, segmento, quantidade, prazo, detalhes, origem, gclid, status, valor_venda')
      .eq('company_id', empresa).gte('created_at', ini).lte('created_at', fim + 'T23:59:59').order('created_at', { ascending: false }).limit(5000),
    supabase.rpc('ads_ultimo_envio', { p_company: empresa }),
  ])

  return (
    <SitePainel
      periodo={periodo}
      ads={(ads.data ?? []) as AdsDia[]}
      termos={(termos.data ?? []) as AdsTermo[]}
      leads={(leads.data ?? []) as SiteLead[]}
      ultimoEnvio={(envio.data as string | null) ?? null}
      erro={ads.error?.message || leads.error?.message || termos.error?.message || null}
    />
  )
}
