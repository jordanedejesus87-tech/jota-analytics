// Métricas do módulo Marketing: anúncios (Meta, Google, TikTok) x contatos x vendas por origem.
import type { AdsDia, SiteEvento, SiteLead } from '@/lib/site/metricas'
import { resumirAds, dataLead } from '@/lib/site/metricas'
import { ORIGENS, type VendaIndividual } from '@/lib/comercial/origens'

export type Plataforma = 'meta' | 'google' | 'tiktok'

export interface MidiaDia {
  plataforma: string
  data: string
  campanha_id: string
  campanha: string
  objetivo: string | null
  conjunto_id: string | null
  conjunto: string | null
  anuncio_id: string
  anuncio: string | null
  posicionamento: string
  impressoes: number
  alcance: number
  cliques: number
  cliques_link: number
  custo: number
  conversas: number
  leads: number
  visitas_pagina: number
  engajamento: number
  video_views: number
  seguidores: number
}

export interface MidiaConta {
  plataforma: string
  conta_id: string
  conta_nome: string | null
  ativo: boolean
  ultimo_envio: string | null
  ultimo_erro: string | null
}

export const div = (a: number, b: number) => (b ? a / b : 0)

export interface ResumoMidia {
  investimento: number
  impressoes: number
  cliques: number
  cliquesLink: number
  conversas: number
  leads: number
  visitas: number
  engajamento: number
  videoViews: number
  contatos: number
  cpm: number
  cpc: number
  ctr: number
  custoConversa: number
  custoLead: number
  custoContato: number
}

export function resumirMidia(linhas: MidiaDia[]): ResumoMidia {
  const s = linhas.reduce((a, r) => {
    a.investimento += Number(r.custo); a.impressoes += r.impressoes; a.cliques += r.cliques; a.cliquesLink += r.cliques_link
    a.conversas += Number(r.conversas); a.leads += Number(r.leads); a.visitas += Number(r.visitas_pagina)
    a.engajamento += Number(r.engajamento); a.videoViews += Number(r.video_views)
    return a
  }, { investimento: 0, impressoes: 0, cliques: 0, cliquesLink: 0, conversas: 0, leads: 0, visitas: 0, engajamento: 0, videoViews: 0 })
  const contatos = s.conversas + s.leads
  return {
    ...s, contatos,
    cpm: div(s.investimento, s.impressoes) * 1000,
    cpc: div(s.investimento, s.cliquesLink),
    ctr: div(s.cliquesLink, s.impressoes),
    custoConversa: div(s.investimento, s.conversas),
    custoLead: div(s.investimento, s.leads),
    custoContato: div(s.investimento, contatos),
  }
}

function agrupar<T>(linhas: MidiaDia[], chave: (r: MidiaDia) => string, extra: (rs: MidiaDia[]) => T) {
  const m = new Map<string, MidiaDia[]>()
  for (const r of linhas) { const k = chave(r); m.set(k, [...(m.get(k) ?? []), r]) }
  return Array.from(m.entries()).map(([k, rs]) => ({ chave: k, ...extra(rs), ...resumirMidia(rs) })).sort((a, b) => b.investimento - a.investimento)
}

const ultima = (rs: MidiaDia[]) => rs.reduce((a, b) => (b.data > a.data ? b : a))

export const porCampanhaMidia = (l: MidiaDia[]) => agrupar(l, (r) => r.campanha_id, (rs) => ({ nome: ultima(rs).campanha, objetivo: ultima(rs).objetivo }))
export const porAnuncioMidia = (l: MidiaDia[]) => agrupar(l, (r) => r.anuncio_id, (rs) => ({ nome: ultima(rs).anuncio || '(sem nome)', campanha: ultima(rs).campanha, dias: new Set(rs.map((r) => r.data)).size }))
export const porPosicionamento = (l: MidiaDia[]) => agrupar(l, (r) => r.posicionamento, () => ({}))

export const POSICIONAMENTO: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', messenger: 'Messenger', audience_network: 'Rede de parceiros (Audience Network)', threads: 'Threads', whatsapp: 'WhatsApp', todos: 'Todos',
}

export const OBJETIVO: Record<string, string> = {
  OUTCOME_ENGAGEMENT: 'Engajamento / mensagens', OUTCOME_LEADS: 'Cadastros', OUTCOME_TRAFFIC: 'Tráfego', OUTCOME_AWARENESS: 'Reconhecimento',
  OUTCOME_SALES: 'Vendas', OUTCOME_APP_PROMOTION: 'App', MESSAGES: 'Mensagens', LINK_CLICKS: 'Tráfego', LEAD_GENERATION: 'Cadastros',
  POST_ENGAGEMENT: 'Engajamento', REACH: 'Alcance', BRAND_AWARENESS: 'Reconhecimento', CONVERSIONS: 'Conversões', VIDEO_VIEWS: 'Visualizações de vídeo',
}

// ── Vendas por canal (Comercial: tabela vendas, venda a venda desde 29/10/2026) ──

/** Venda atribuída a anúncio do Meta: origem "anúncio" no Comercial ou orçamento do site que veio de anúncio do Meta. */
export const vendaMeta = (v: VendaIndividual) => v.origem === 'instagram_anuncio' || v.origem === 'facebook_anuncio' || v.canal_site === 'meta_ads'
export const vendaGoogleAds = (v: VendaIndividual) => v.canal_site === 'google_ads'
export const vendaTiktok = (v: VendaIndividual) => v.origem === 'tiktok'

export interface LinhaAquisicao {
  id: string
  rotulo: string
  barra: string
  pago: boolean
  plataforma?: Plataforma
  vendas: number
  faturamento: number
  part: number
  ticket: number
  investimento: number
  custoVenda: number
  retorno: number
}

/** Canais de aquisição: de onde vêm as vendas, com investimento e retorno para os canais pagos. */
export function canaisAquisicao(vendas: VendaIndividual[], invest: Record<Plataforma, number>): LinhaAquisicao[] {
  const total = vendas.reduce((s, v) => s + v.valor, 0)
  const linha = (id: string, rotulo: string, barra: string, lista: VendaIndividual[], pago: boolean, plataforma?: Plataforma): LinhaAquisicao => {
    const f = lista.reduce((s, v) => s + v.valor, 0)
    const inv = plataforma ? invest[plataforma] : 0
    return { id, rotulo, barra, pago, plataforma, vendas: lista.length, faturamento: f, part: div(f, total), ticket: div(f, lista.length), investimento: inv, custoVenda: div(inv, lista.length), retorno: div(f, inv) }
  }
  const usadas = new Set<string>()
  const pega = (fn: (v: VendaIndividual) => boolean) => vendas.filter((v) => { if (usadas.has(v.id) || !fn(v)) return false; usadas.add(v.id); return true })

  const linhas: LinhaAquisicao[] = [
    linha('meta', 'Anúncios Meta (Instagram/Facebook)', 'bg-violet-600', pega(vendaMeta), true, 'meta'),
    linha('google', 'Anúncios Google', 'bg-sky-500', pega(vendaGoogleAds), true, 'google'),
    linha('tiktok', 'TikTok', 'bg-slate-800', pega(vendaTiktok), invest.tiktok > 0, 'tiktok'),
  ]
  for (const o of ORIGENS) {
    if (['instagram_anuncio', 'facebook_anuncio', 'tiktok'].includes(o.id)) continue
    const rot = o.id === 'site_google' ? 'Site / Google orgânico' : o.rotulo
    linhas.push(linha(o.id, rot, o.barra, pega((v) => v.origem === o.id), false))
  }
  return linhas.sort((a, b) => b.faturamento - a.faturamento || Number(b.pago) - Number(a.pago))
}

// ── Funil por plataforma (custo por etapa) ──

export interface Funil {
  investimento: number
  impressoes: number
  cliques: number
  contatos: number
  orcamentos: number
  vendas: number
  faturamento: number
}

export function funilMeta(m: ResumoMidia, leads: SiteLead[], vendas: VendaIndividual[]): Funil {
  const v = vendas.filter(vendaMeta)
  return {
    investimento: m.investimento, impressoes: m.impressoes, cliques: m.cliquesLink, contatos: m.contatos,
    orcamentos: leads.filter((l) => l.canal === 'meta_ads').length,
    vendas: v.length, faturamento: v.reduce((s, x) => s + x.valor, 0),
  }
}

export function funilGoogle(ads: AdsDia[], leads: SiteLead[], vendas: VendaIndividual[]): Funil {
  const g = resumirAds(ads)
  const v = vendas.filter(vendaGoogleAds)
  return {
    investimento: g.investimento, impressoes: g.impressoes, cliques: g.cliques, contatos: g.contatos,
    orcamentos: leads.filter((l) => (l.canal ? l.canal === 'google_ads' : Boolean(l.gclid))).length,
    vendas: v.length, faturamento: v.reduce((s, x) => s + x.valor, 0),
  }
}

export function funilTiktok(m: ResumoMidia, vendas: VendaIndividual[]): Funil {
  const v = vendas.filter(vendaTiktok)
  return { investimento: m.investimento, impressoes: m.impressoes, cliques: m.cliquesLink, contatos: m.contatos, orcamentos: 0, vendas: v.length, faturamento: v.reduce((s, x) => s + x.valor, 0) }
}

export const somarFunis = (fs: Funil[]): Funil => fs.reduce((a, f) => ({
  investimento: a.investimento + f.investimento, impressoes: a.impressoes + f.impressoes, cliques: a.cliques + f.cliques,
  contatos: a.contatos + f.contatos, orcamentos: a.orcamentos + f.orcamentos, vendas: a.vendas + f.vendas, faturamento: a.faturamento + f.faturamento,
}), { investimento: 0, impressoes: 0, cliques: 0, contatos: 0, orcamentos: 0, vendas: 0, faturamento: 0 })

// ── Série diária ──

export interface DiaMarketing { data: string; meta: number; google: number; tiktok: number; contatos: number }

export function serieMarketing(midia: MidiaDia[], ads: AdsDia[], de: string, ate: string): DiaMarketing[] {
  const m = new Map<string, DiaMarketing>()
  for (let d = new Date(de + 'T12:00:00Z'); d.toISOString().slice(0, 10) <= ate; d.setUTCDate(d.getUTCDate() + 1)) {
    const k = d.toISOString().slice(0, 10)
    m.set(k, { data: k, meta: 0, google: 0, tiktok: 0, contatos: 0 })
  }
  for (const r of midia) {
    const x = m.get(r.data); if (!x) continue
    if (r.plataforma === 'tiktok') x.tiktok += Number(r.custo); else x.meta += Number(r.custo)
    x.contatos += Number(r.conversas) + Number(r.leads)
  }
  for (const r of ads) {
    const x = m.get(r.data); if (!x) continue
    x.google += Number(r.custo); x.contatos += Number(r.conv_whatsapp) + Number(r.conv_orcamento)
  }
  return Array.from(m.values()).map((x) => ({ ...x, meta: Math.round(x.meta * 100) / 100, google: Math.round(x.google * 100) / 100, tiktok: Math.round(x.tiktok * 100) / 100, contatos: Math.round(x.contatos * 10) / 10 }))
}

export { dataLead }
export type { SiteEvento }
