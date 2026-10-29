// CRM de leads do site (módulo Leads)
import { infoCanal } from '@/lib/site/metricas'

export type Etapa = 'novo' | 'em_atendimento' | 'orcado' | 'vendido' | 'perdido'

export interface LeadCRM {
  id: string
  created_at: string
  nome: string
  cidade: string
  empresa: string | null
  telefone: string | null
  produtos: string | null
  segmento: string | null
  quantidade: string | null
  prazo: string | null
  detalhes: string | null
  canal: string | null
  gclid: string | null
  status: Etapa
  responsavel_id: string | null
  respondido_em: string | null
  respondido_por: string | null
  orcado_em: string | null
  valor_orcamento: number | null
  fechado_em: string | null
  valor_venda: number | null
  motivo_perda: string | null
  retorno_em: string | null
  observacoes: string | null
}

export const CAMPOS_LEAD =
  'id, created_at, nome, cidade, empresa, telefone, produtos, segmento, quantidade, prazo, detalhes, canal, gclid, status, responsavel_id, respondido_em, respondido_por, orcado_em, valor_orcamento, fechado_em, valor_venda, motivo_perda, retorno_em, observacoes'

export const ETAPAS: { id: Etapa; rotulo: string; cor: string }[] = [
  { id: 'novo', rotulo: 'Para responder', cor: 'bg-red-50 text-red-700' },
  { id: 'em_atendimento', rotulo: 'Em atendimento', cor: 'bg-amber-50 text-amber-700' },
  { id: 'orcado', rotulo: 'Orçamento enviado', cor: 'bg-indigo-50 text-indigo-700' },
  { id: 'vendido', rotulo: 'Venda fechada', cor: 'bg-emerald-50 text-emerald-700' },
  { id: 'perdido', rotulo: 'Não fechou', cor: 'bg-gray-100 text-gray-600' },
]
export const etapa = (id: string) => ETAPAS.find((e) => e.id === id) ?? ETAPAS[0]

export const MOTIVOS = [
  'Não respondeu mais',
  'Achou caro',
  'Prazo não atende',
  'Só estava pesquisando',
  'Comprou de outro fornecedor',
  'Quantidade ou produto que não fazemos',
  'Contato inválido / engano',
  'Outro',
]

export const META_RESPOSTA_MIN = 15

// ── Tempo útil (expediente da LAESC: seg a sex, 8h–12h e 13h30–18h, horário de Brasília) ──
const JANELAS: [number, number][] = [[8 * 60, 12 * 60], [13 * 60 + 30, 18 * 60]]
/** Lead que chega a partir deste horário só começa a contar às 8h do próximo dia útil. */
const CORTE_FIM_DIA = 17 * 60 + 30

/** Faixas do tempo de resposta: verde até 15 min, amarelo até 1 h, vermelho acima. */
export const LIMITE_AMARELO_MIN = 60
export type Faixa = 'verde' | 'amarelo' | 'vermelho'
export const faixaTempo = (min: number): Faixa => (min <= META_RESPOSTA_MIN ? 'verde' : min <= LIMITE_AMARELO_MIN ? 'amarelo' : 'vermelho')
export const COR_FAIXA: Record<Faixa, string> = { verde: 'text-emerald-600', amarelo: 'text-amber-600', vermelho: 'text-red-600' }

/** Papéis que enxergam tempo de resposta, médias e ranking. O comercial (quem atende) não vê. */
export const PAPEIS_VEEM_TEMPO = ['admin', 'system', 'client']

// ── Dias sem expediente (não contam no tempo de resposta). Para incluir/retirar um feriado, edite as listas abaixo. ──
// Fixos todo ano (MM-DD): nacionais + 20/09 Revolução Farroupilha (RS) + municipais de Caçapava do Sul (15/08 e 25/10)
const FERIADOS_FIXOS = [
  '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25', // nacionais
  '09-20', // RS
  '08-15', '10-25', // Caçapava do Sul
]
// Datas avulsas (AAAA-MM-DD), ex.: ponte ou fechamento extra
const FERIADOS_EXTRAS: string[] = []

/** Páscoa (algoritmo de Meeus/Jones/Butcher), em UTC. */
function pascoa(ano: number) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1
  return Date.UTC(ano, mes - 1, dia)
}
const moveisCache = new Map<number, string[]>()
/** Segunda e terça de Carnaval, Sexta-feira Santa e Corpus Christi do ano. */
function feriadosMoveis(ano: number) {
  if (!moveisCache.has(ano)) {
    const p = pascoa(ano), d = (n: number) => new Date(p + n * 864e5).toISOString().slice(0, 10)
    moveisCache.set(ano, [d(-48), d(-47), d(-2), d(60)])
  }
  return moveisCache.get(ano)!
}
export const ehFeriado = (d: Date) => {
  const iso = d.toISOString().slice(0, 10)
  return FERIADOS_FIXOS.includes(iso.slice(5)) || FERIADOS_EXTRAS.includes(iso) || feriadosMoveis(d.getUTCFullYear()).includes(iso)
}
const SP = (iso: string | Date) => new Date(new Date(iso).getTime() - 3 * 3600e3) // relógio de São Paulo em campos UTC

/** Minutos de expediente entre dois instantes. Lead que chega à noite, ou a partir das 17h30, começa a contar às 8h do próximo dia útil. */
export function minutosUteis(inicio: string | Date, fim: string | Date): number {
  let a = SP(inicio)
  const b = SP(fim)
  if (a.getUTCHours() * 60 + a.getUTCMinutes() >= CORTE_FIM_DIA)
    a = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate() + 1))
  if (b <= a) return 0
  let total = 0
  const dia = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()))
  while (dia <= b) {
    const sem = dia.getUTCDay()
    if (sem >= 1 && sem <= 5 && !ehFeriado(dia)) {
      for (const [ini, fi] of JANELAS) {
        const jIni = dia.getTime() + ini * 60e3, jFim = dia.getTime() + fi * 60e3
        const s = Math.max(jIni, a.getTime()), e = Math.min(jFim, b.getTime())
        if (e > s) total += (e - s) / 60e3
      }
    }
    dia.setUTCDate(dia.getUTCDate() + 1)
  }
  return Math.round(total)
}

export const tempoResposta = (l: Pick<LeadCRM, 'created_at' | 'respondido_em'>, agora = new Date()) =>
  minutosUteis(l.created_at, l.respondido_em ?? agora)

export function fmtMin(m: number | null | undefined) {
  if (m === null || m === undefined || Number.isNaN(m)) return '—'
  if (m < 60) return `${Math.round(m)} min`
  const h = Math.floor(m / 60), r = Math.round(m % 60)
  if (h < 10) return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
  return `${Math.round(m / 60)}h`
}

export const dataSP = (iso: string) => SP(iso).toISOString().slice(0, 10)
export const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
export const origemLead = (l: Pick<LeadCRM, 'canal' | 'gclid'>) => infoCanal(l.canal || (l.gclid ? 'google_ads' : null))

export const linkWhats = (tel?: string | null) => {
  const d = (tel || '').replace(/\D/g, '')
  if (d.length < 10) return null
  return `https://wa.me/${d.startsWith('55') && d.length > 11 ? d : '55' + d}`
}

export interface Metricas {
  recebidos: number
  respondidos: number
  emAte15: number
  pctAte15: number
  mediaResposta: number | null
  medianaResposta: number | null
  aguardando: number
  orcados: number
  vendidos: number
  perdidos: number
  faturamento: number
  valorOrcado: number
  taxaOrcamento: number
  taxaVenda: number
  motivos: { motivo: string; qtd: number }[]
}

export function metricas(leads: LeadCRM[], agora = new Date()): Metricas {
  const resp = leads.filter((l) => l.respondido_em)
  const tempos = resp.map((l) => tempoResposta(l)).sort((a, b) => a - b)
  const emAte15 = tempos.filter((t) => t <= META_RESPOSTA_MIN).length
  const orcados = leads.filter((l) => l.orcado_em || l.status === 'orcado' || l.status === 'vendido').length
  const vendidos = leads.filter((l) => l.status === 'vendido')
  const perdidos = leads.filter((l) => l.status === 'perdido')
  const m = new Map<string, number>()
  for (const l of perdidos) m.set(l.motivo_perda || 'Sem motivo', (m.get(l.motivo_perda || 'Sem motivo') ?? 0) + 1)
  return {
    recebidos: leads.length,
    respondidos: resp.length,
    emAte15,
    pctAte15: resp.length ? emAte15 / resp.length : 0,
    mediaResposta: tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : null,
    medianaResposta: tempos.length ? tempos[Math.floor((tempos.length - 1) / 2)] : null,
    aguardando: leads.filter((l) => l.status === 'novo').length,
    orcados,
    vendidos: vendidos.length,
    perdidos: perdidos.length,
    faturamento: vendidos.reduce((a, l) => a + Number(l.valor_venda || 0), 0),
    valorOrcado: leads.reduce((a, l) => a + Number(l.valor_orcamento || 0), 0),
    taxaOrcamento: leads.length ? orcados / leads.length : 0,
    taxaVenda: leads.length ? vendidos.length / leads.length : 0,
    motivos: Array.from(m, ([motivo, qtd]) => ({ motivo, qtd })).sort((a, b) => b.qtd - a.qtd),
  }
}
