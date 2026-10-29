// Métricas do módulo "Site e Google Ads"

export interface AdsDia {
  data: string
  campanha_id: string
  campanha: string
  status: string | null
  impressoes: number
  cliques: number
  custo: number
  conversoes: number
  conv_whatsapp: number
  conv_orcamento: number
}

export interface AdsTermo {
  data: string
  campanha: string
  termo: string
  impressoes: number
  cliques: number
  custo: number
  conversoes: number
}

export type StatusLead = 'novo' | 'em_atendimento' | 'orcado' | 'vendido' | 'perdido'

export interface SiteLead {
  id: string
  created_at: string
  nome: string
  cidade: string
  empresa: string | null
  produtos: string | null
  segmento: string | null
  quantidade: string | null
  prazo: string | null
  detalhes: string | null
  origem: string | null
  gclid: string | null
  status: StatusLead
  valor_venda: number | null
  canal: string | null
  utm_source: string | null
  utm_campaign: string | null
  referrer: string | null
}

export interface SiteEvento {
  created_at: string
  tipo: 'whatsapp_click'
  local: string | null
  canal: string | null
  utm_campaign: string | null
}

export type Grupo = 'pago' | 'organico'

/** Canais de origem gravados pelo site (laesc.com.br) */
export const CANAIS: Record<string, { rotulo: string; grupo: Grupo; cor: string }> = {
  google_ads: { rotulo: 'Google Ads', grupo: 'pago', cor: 'bg-indigo-600 text-white' },
  meta_ads: { rotulo: 'Anúncio Instagram/Facebook', grupo: 'pago', cor: 'bg-violet-600 text-white' },
  outros_anuncios: { rotulo: 'Outros anúncios', grupo: 'pago', cor: 'bg-indigo-100 text-indigo-800' },
  busca_organica: { rotulo: 'Google (orgânico)', grupo: 'organico', cor: 'bg-emerald-50 text-emerald-700' },
  redes_sociais: { rotulo: 'Instagram/Facebook (orgânico)', grupo: 'organico', cor: 'bg-pink-50 text-pink-700' },
  whatsapp: { rotulo: 'Link no WhatsApp', grupo: 'organico', cor: 'bg-green-50 text-green-700' },
  outros_sites: { rotulo: 'Outros sites', grupo: 'organico', cor: 'bg-gray-100 text-gray-700' },
  direto: { rotulo: 'Digitou o endereço', grupo: 'organico', cor: 'bg-amber-50 text-amber-700' },
  nao_identificado: { rotulo: 'Sem origem registrada', grupo: 'organico', cor: 'bg-gray-100 text-gray-500' },
}
export const infoCanal = (c?: string | null) => CANAIS[c || 'nao_identificado'] ?? { rotulo: c || 'Sem origem', grupo: 'organico' as Grupo, cor: 'bg-gray-100 text-gray-600' }

export interface LinhaCanal {
  canal: string
  rotulo: string
  grupo: Grupo
  orcamentos: number
  whatsapp: number
  contatos: number
  vendas: number
  faturamento: number
}

export function porCanal(leads: SiteLead[], eventos: SiteEvento[]): LinhaCanal[] {
  const m = new Map<string, LinhaCanal>()
  const linha = (c: string) => {
    if (!m.has(c)) { const i = infoCanal(c); m.set(c, { canal: c, rotulo: i.rotulo, grupo: i.grupo, orcamentos: 0, whatsapp: 0, contatos: 0, vendas: 0, faturamento: 0 }) }
    return m.get(c)!
  }
  for (const l of leads) {
    const x = linha(l.canal || (l.gclid ? 'google_ads' : 'nao_identificado'))
    x.orcamentos++; x.contatos++
    if (l.status === 'vendido') { x.vendas++; x.faturamento += Number(l.valor_venda || 0) }
  }
  for (const e of eventos) { const x = linha(e.canal || 'nao_identificado'); x.whatsapp++; x.contatos++ }
  return Array.from(m.values()).sort((a, b) => (a.grupo === b.grupo ? b.contatos - a.contatos : a.grupo === 'pago' ? -1 : 1))
}

export function somarGrupo(linhas: LinhaCanal[], g: Grupo) {
  return linhas.filter((l) => l.grupo === g).reduce((a, l) => ({
    orcamentos: a.orcamentos + l.orcamentos, whatsapp: a.whatsapp + l.whatsapp, contatos: a.contatos + l.contatos,
    vendas: a.vendas + l.vendas, faturamento: a.faturamento + l.faturamento,
  }), { orcamentos: 0, whatsapp: 0, contatos: 0, vendas: 0, faturamento: 0 })
}

export const STATUS: { id: StatusLead; rotulo: string; cor: string }[] = [
  { id: 'novo', rotulo: 'Novo', cor: 'bg-sky-50 text-sky-700' },
  { id: 'em_atendimento', rotulo: 'Em atendimento', cor: 'bg-amber-50 text-amber-700' },
  { id: 'orcado', rotulo: 'Orçado', cor: 'bg-indigo-50 text-indigo-700' },
  { id: 'vendido', rotulo: 'Vendido', cor: 'bg-emerald-50 text-emerald-700' },
  { id: 'perdido', rotulo: 'Perdido', cor: 'bg-gray-100 text-gray-600' },
]

/** Data do lead no fuso de São Paulo (YYYY-MM-DD). */
export const dataLead = (l: Pick<SiteLead, 'created_at'>) =>
  new Date(new Date(l.created_at).getTime() - 3 * 3600e3).toISOString().slice(0, 10)

export const veioDoGoogle = (l: Pick<SiteLead, 'gclid' | 'origem'> & { canal?: string | null }) => l.canal ? infoCanal(l.canal).grupo === 'pago' : Boolean(l.gclid)

export interface ResumoAds {
  investimento: number
  impressoes: number
  cliques: number
  cpc: number
  ctr: number
  convWhatsapp: number
  convOrcamento: number
  contatos: number
  custoContato: number
}

export function resumirAds(linhas: AdsDia[]): ResumoAds {
  const s = linhas.reduce((a, r) => {
    a.investimento += Number(r.custo); a.impressoes += r.impressoes; a.cliques += r.cliques
    a.convWhatsapp += Number(r.conv_whatsapp); a.convOrcamento += Number(r.conv_orcamento)
    return a
  }, { investimento: 0, impressoes: 0, cliques: 0, convWhatsapp: 0, convOrcamento: 0 })
  const contatos = s.convWhatsapp + s.convOrcamento
  return {
    ...s,
    cpc: s.cliques ? s.investimento / s.cliques : 0,
    ctr: s.impressoes ? s.cliques / s.impressoes : 0,
    contatos,
    custoContato: contatos ? s.investimento / contatos : 0,
  }
}

export interface ResumoLeads { total: number; google: number; vendidos: number; faturamento: number; abertos: number }

export function resumirLeads(leads: SiteLead[]): ResumoLeads {
  return {
    total: leads.length,
    google: leads.filter(veioDoGoogle).length,
    vendidos: leads.filter((l) => l.status === 'vendido').length,
    faturamento: leads.reduce((a, l) => a + (l.status === 'vendido' ? Number(l.valor_venda || 0) : 0), 0),
    abertos: leads.filter((l) => l.status === 'novo' || l.status === 'em_atendimento').length,
  }
}

export function porCampanha(linhas: AdsDia[]) {
  const m = new Map<string, AdsDia[]>()
  for (const r of linhas) m.set(r.campanha_id, [...(m.get(r.campanha_id) ?? []), r])
  return Array.from(m.values())
    .map((rs) => {
      const ultima = rs.reduce((a, b) => (b.data > a.data ? b : a))
      return { id: ultima.campanha_id, nome: ultima.campanha, status: ultima.status, ...resumirAds(rs) }
    })
    .sort((a, b) => b.investimento - a.investimento)
}

export function porTermo(termos: AdsTermo[]) {
  const m = new Map<string, { termo: string; impressoes: number; cliques: number; custo: number; conversoes: number }>()
  for (const t of termos) {
    const k = t.termo.toLowerCase()
    const x = m.get(k) ?? { termo: t.termo, impressoes: 0, cliques: 0, custo: 0, conversoes: 0 }
    x.impressoes += t.impressoes; x.cliques += t.cliques; x.custo += Number(t.custo); x.conversoes += Number(t.conversoes)
    m.set(k, x)
  }
  return Array.from(m.values()).sort((a, b) => b.custo - a.custo || b.cliques - a.cliques)
}

/** Série diária do período com investimento e contatos (dias sem dado entram zerados). */
export function serieDiaria(linhas: AdsDia[], leads: SiteLead[], de: string, ate: string) {
  const dias: { data: string; investimento: number; cliques: number; contatos: number; leads: number }[] = []
  for (let d = new Date(de + 'T12:00:00Z'); d.toISOString().slice(0, 10) <= ate; d.setUTCDate(d.getUTCDate() + 1)) {
    const k = d.toISOString().slice(0, 10)
    const rs = linhas.filter((r) => r.data === k)
    dias.push({
      data: k,
      investimento: rs.reduce((a, r) => a + Number(r.custo), 0),
      cliques: rs.reduce((a, r) => a + r.cliques, 0),
      contatos: rs.reduce((a, r) => a + Number(r.conv_whatsapp) + Number(r.conv_orcamento), 0),
      leads: leads.filter((l) => dataLead(l) === k).length,
    })
  }
  return dias
}
