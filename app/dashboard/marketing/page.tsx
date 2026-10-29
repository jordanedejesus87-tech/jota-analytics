import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MarketingPainel, { type Aba } from '@/components/marketing/MarketingPainel'
import { hojeSP, resolverPeriodo, somarDias } from '@/lib/externo/metricas'
import type { AdsDia, SiteLead } from '@/lib/site/metricas'
import type { VendaIndividual } from '@/lib/comercial/origens'
import type { MidiaConta, MidiaDia } from '@/lib/marketing/metricas'

export const dynamic = 'force-dynamic'

const PAPEIS = ['admin', 'system', 'client']
const ABAS = ['geral', 'meta', 'google', 'tiktok'] as const

export default async function MarketingPage({ searchParams }: { searchParams: { p?: string; de?: string; ate?: string; aba?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role, company_id, name').eq('id', user.id).single()
  if (!profile || !PAPEIS.includes(profile.role)) redirect('/dashboard')

  const aba: Aba = (ABAS as readonly string[]).includes(searchParams.aba || '') ? (searchParams.aba as Aba) : 'geral'
  const hoje = hojeSP()
  const periodo = resolverPeriodo({ ...searchParams, p: searchParams.p || (searchParams.de ? undefined : '30d') }, hoje, '2026-08-01')
  const empresa = profile.company_id
  const ini = somarDias(periodo.antDe, -1), fim = somarDias(periodo.ate, 1)

  const [midia, ads, vendas, leads, contas, envioGoogle] = await Promise.all([
    supabase.from('midia_diario')
      .select('plataforma, data, campanha_id, campanha, objetivo, conjunto_id, conjunto, anuncio_id, anuncio, posicionamento, impressoes, alcance, cliques, cliques_link, custo, conversas, leads, visitas_pagina, engajamento, video_views, seguidores')
      .eq('company_id', empresa).gte('data', periodo.antDe).lte('data', periodo.ate).limit(20000),
    supabase.from('ads_diario').select('data, campanha_id, campanha, status, impressoes, cliques, custo, conversoes, conv_whatsapp, conv_orcamento')
      .eq('company_id', empresa).gte('data', periodo.antDe).lte('data', periodo.ate).limit(10000),
    supabase.from('vendas').select('id, company_id, salesperson_name, sale_date, valor, origem, cliente, pedido, observacao, site_lead_id, canal_site, created_at')
      .eq('company_id', empresa).gte('sale_date', periodo.antDe).lte('sale_date', periodo.ate).limit(10000),
    supabase.from('site_leads').select('id, created_at, nome, cidade, empresa, produtos, segmento, quantidade, prazo, detalhes, origem, gclid, status, valor_venda, canal, utm_source, utm_campaign, referrer')
      .eq('company_id', empresa).gte('created_at', ini).lte('created_at', fim + 'T23:59:59').limit(5000),
    supabase.from('midia_contas').select('plataforma, conta_id, conta_nome, ativo, ultimo_envio, ultimo_erro').eq('company_id', empresa),
    supabase.rpc('ads_ultimo_envio', { p_company: empresa }),
  ])

  return (
    <MarketingPainel
      aba={aba}
      periodo={periodo}
      midia={(midia.data ?? []).map((r) => ({ ...r, custo: Number(r.custo), conversas: Number(r.conversas), leads: Number(r.leads) })) as MidiaDia[]}
      ads={(ads.data ?? []) as AdsDia[]}
      vendas={(vendas.data ?? []).map((v) => ({ ...v, valor: Number(v.valor) })) as VendaIndividual[]}
      leads={(leads.data ?? []) as SiteLead[]}
      contas={(contas.data ?? []) as MidiaConta[]}
      ultimoGoogle={(envioGoogle.data as string | null) ?? null}
      podeAtualizar={['admin', 'system', 'client'].includes(profile.role)}
      ehAdmin={['admin', 'system'].includes(profile.role)}
      erro={midia.error?.message || ads.error?.message || vendas.error?.message || null}
    />
  )
}
