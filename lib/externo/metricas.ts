// Regras do módulo Vendedor Externo — as mesmas do painel semanal da Jota (laesc_metricas.py).
export const METAS = { visitas: 35, pctProximoPasso: 0.7, pctSoMaterial: 0.2, clientesNovos: 2 }

export interface VisitaExt {
  id: number
  company_id: string
  data_visita: string
  hora_chegada: string | null
  hora_saida: string | null
  duracao_min: number | null
  rota: string
  cliente: string
  bairro: string | null
  obs: string | null
  agendamento: string | null
  n_funcionarios: number | null
  ja_compra_uniforme: string | null
  ja_comprou_laesc: string | null
  expectativa_pecas: number | null
  possibilidade: 'Alta' | 'Média' | 'Baixa' | null
  pecas_vendidas: number | null
  faturamento: number | string | null
  vendedor: string
  vendedor_id: string
  empresa_id: number
  origem: string
  tipo?: 'primeira' | 'followup'
  objetivo?: string | null
  proximo_passo?: string | null
  retorno_data?: string | null
  telefone?: string | null
  endereco?: string | null
  contato?: string | null
}

export interface Semana {
  semana: string
  rotulo: string
  diasCampo: number
  visitas: number
  visitasDia: number
  duracaoMedia: number | null
  vendas: number
  pecas: number
  faturamento: number
  clientesNovos: number
  pctProximoPasso: number
  pctSoMaterial: number
  expectativa: number
}

const norm = (s: unknown) =>
  String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

const PROX = /orcament|orcqmento|voltar|retorno|ligar|verific|aguard|mandar|vai |confirmar|ver com|ver as|ir no|fazer|interes|interres|interrese|negociad|fechou|tamanh|logo/
const MATERIAL = /^(deixei )?material\s*$/

export function hojeSP() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}
export function agoraSP() {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
}
export function segundaDe(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}
export function somarDias(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export const dm = (iso?: string | null) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '')
export const dmy = (iso?: string | null) => (iso ? dm(iso) + '/' + iso.slice(0, 4) : '')
export const rotuloSemana = (k: string) => dm(k) + '–' + dm(somarDias(k, 6))

export function classificar(v: Pick<VisitaExt, 'obs' | 'agendamento' | 'pecas_vendidas' | 'faturamento' | 'ja_comprou_laesc'> & Partial<Pick<VisitaExt, 'proximo_passo' | 'retorno_data'>>) {
  const obs = norm(v.obs)
  const vendeu = (v.pecas_vendidas || 0) > 0 || Number(v.faturamento || 0) > 0
  const ag = String(v.agendamento ?? '').trim() || String(v.retorno_data ?? '').trim()
  return {
    vendeu,
    clienteNovo: vendeu && norm(v.ja_comprou_laesc) === 'nao',
    proximoPasso: Boolean(ag) || Boolean(String(v.proximo_passo ?? '').trim()) || PROX.test(obs) || vendeu,
    soMaterial: MATERIAL.test(obs) && !ag,
  }
}

export function semanaVazia(k: string): Semana {
  return { semana: k, rotulo: rotuloSemana(k), diasCampo: 0, visitas: 0, visitasDia: 0, duracaoMedia: null, vendas: 0, pecas: 0, faturamento: 0, clientesNovos: 0, pctProximoPasso: 0, pctSoMaterial: 0, expectativa: 0 }
}

export type Resumo = Omit<Semana, 'semana' | 'rotulo'>

export function agregar(visitas: VisitaExt[]): Resumo {
  const dias = new Set<string>()
  const dur: number[] = []
  let vendas = 0, pecas = 0, fat = 0, novos = 0, prox = 0, mat = 0, exp = 0
  for (const v of visitas) {
    const c = classificar(v)
    dias.add(v.data_visita)
    if (v.duracao_min) dur.push(v.duracao_min)
    vendas += c.vendeu ? 1 : 0
    pecas += v.pecas_vendidas || 0
    fat += Number(v.faturamento || 0)
    novos += c.clienteNovo ? 1 : 0
    prox += c.proximoPasso ? 1 : 0
    mat += c.soMaterial ? 1 : 0
    exp += v.expectativa_pecas || 0
  }
  const n = visitas.length
  return {
    diasCampo: dias.size,
    visitas: n,
    visitasDia: dias.size ? n / dias.size : 0,
    duracaoMedia: dur.length ? dur.reduce((a, b) => a + b, 0) / dur.length : null,
    vendas, pecas, faturamento: fat, clientesNovos: novos,
    pctProximoPasso: n ? prox / n : 0,
    pctSoMaterial: n ? mat / n : 0,
    expectativa: exp,
  }
}

export function porSemana(visitas: VisitaExt[]): Semana[] {
  const grupos = new Map<string, VisitaExt[]>()
  for (const v of visitas) {
    const k = segundaDe(v.data_visita)
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(v)
  }
  return Array.from(grupos.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, vs]) => ({ semana: k, rotulo: rotuloSemana(k), ...agregar(vs) }))
}

// ── Período (filtro do painel e das visitas) ────────────────────────────────
export const ATALHOS = [
  { id: 'semana', rotulo: 'Esta semana' },
  { id: 'semana_passada', rotulo: 'Semana passada' },
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes_passado', rotulo: 'Mês passado' },
  { id: '30d', rotulo: 'Últimos 30 dias' },
  { id: 'tudo', rotulo: 'Desde o início' },
] as const

export interface Periodo { de: string; ate: string; atalho: string; rotulo: string; dias: number; antDe: string; antAte: string }

const ISO = /^\d{4}-\d{2}-\d{2}$/
const diasEntre = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00Z').getTime() - new Date(a + 'T12:00:00Z').getTime()) / 864e5)
export const dmyCurto = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(2, 4)

export function resolverPeriodo(sp: { p?: string; de?: string; ate?: string }, hoje: string, inicio = '2026-09-01'): Periodo {
  let de = '', ate = '', atalho = sp.p || ''
  if (sp.de && sp.ate && ISO.test(sp.de) && ISO.test(sp.ate)) {
    de = sp.de <= sp.ate ? sp.de : sp.ate
    ate = sp.de <= sp.ate ? sp.ate : sp.de
    atalho = 'custom'
  } else {
    const seg = segundaDe(hoje)
    const mesIni = hoje.slice(0, 8) + '01'
    const mesPassFim = somarDias(mesIni, -1)
    const mapa: Record<string, [string, string]> = {
      semana: [seg, hoje],
      semana_passada: [somarDias(seg, -7), somarDias(seg, -1)],
      mes: [mesIni, hoje],
      mes_passado: [mesPassFim.slice(0, 8) + '01', mesPassFim],
      '30d': [somarDias(hoje, -29), hoje],
      tudo: [inicio, hoje],
    }
    if (!mapa[atalho]) atalho = 'semana'
    ;[de, ate] = mapa[atalho]
  }
  const dias = diasEntre(de, ate) + 1
  const nome = ATALHOS.find((a) => a.id === atalho)?.rotulo
  return {
    de, ate, atalho, dias,
    rotulo: nome ? `${nome} (${dmyCurto(de)} a ${dmyCurto(ate)})` : `${dmyCurto(de)} a ${dmyCurto(ate)}`,
    antAte: somarDias(de, -1),
    antDe: somarDias(de, -dias),
  }
}

export const noPeriodo = (v: { data_visita: string }, de: string, ate: string) => v.data_visita >= de && v.data_visita <= ate

// Último registro de cada empresa sem venda, possibilidade Alta/Média e expectativa de peças.
export function oportunidades(visitas: VisitaExt[]) {
  const ultimo = new Map<number, VisitaExt>()
  const vendidas = new Set<number>()
  const ord = [...visitas].sort((a, b) => (a.data_visita + (a.hora_chegada || '')).localeCompare(b.data_visita + (b.hora_chegada || '')))
  for (const v of ord) {
    ultimo.set(v.empresa_id, v)
    if (classificar(v).vendeu) vendidas.add(v.empresa_id)
  }
  const peso: Record<string, number> = { Alta: 0, 'Média': 1 }
  return Array.from(ultimo.values())
    .filter((v) => !vendidas.has(v.empresa_id) && (v.expectativa_pecas || 0) > 0 && v.possibilidade && v.possibilidade in peso)
    .sort((a, b) => peso[a.possibilidade!] - peso[b.possibilidade!] || (b.expectativa_pecas || 0) - (a.expectativa_pecas || 0))
}

const ordemVisita = (a: VisitaExt, b: VisitaExt) => (a.data_visita + (a.hora_chegada || '') + String(a.id).padStart(9, '0')).localeCompare(b.data_visita + (b.hora_chegada || '') + String(b.id).padStart(9, '0'))

/** Data do retorno: a coluna retorno_data ou um agendamento escrito como dd/mm/aaaa. */
export function dataRetorno(v: Pick<VisitaExt, 'retorno_data' | 'agendamento'>): string | null {
  if (v.retorno_data) return v.retorno_data
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v.agendamento ?? '').trim())
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

export interface ItemAgenda { data: string | null; ultima: VisitaExt; visitas: number }
export interface Agenda { atrasados: ItemAgenda[]; hoje: ItemAgenda[]; proximos: ItemAgenda[]; depois: ItemAgenda[]; semData: ItemAgenda[] }

/** Agenda de retornos: a última visita de cada empresa com retorno marcado. Uma visita nova à empresa substitui o retorno anterior. */
export function agenda(visitas: VisitaExt[], hoje: string, diasProximos = 7): Agenda {
  const ultimo = new Map<number, VisitaExt>()
  const qtd = new Map<number, number>()
  for (const v of [...visitas].sort(ordemVisita)) {
    ultimo.set(v.empresa_id, v)
    qtd.set(v.empresa_id, (qtd.get(v.empresa_id) ?? 0) + 1)
  }
  const out: Agenda = { atrasados: [], hoje: [], proximos: [], depois: [], semData: [] }
  const limite = somarDias(hoje, diasProximos)
  for (const v of Array.from(ultimo.values())) {
    const data = dataRetorno(v)
    const item = { data, ultima: v, visitas: qtd.get(v.empresa_id) ?? 1 }
    if (data) {
      if (data < hoje) out.atrasados.push(item)
      else if (data === hoje) out.hoje.push(item)
      else if (data <= limite) out.proximos.push(item)
      else out.depois.push(item)
    } else if (String(v.agendamento ?? '').trim()) out.semData.push(item)
  }
  const porData = (a: ItemAgenda, b: ItemAgenda) => (a.data || '').localeCompare(b.data || '') || a.ultima.cliente.localeCompare(b.ultima.cliente)
  out.atrasados.sort(porData); out.hoje.sort((a, b) => a.ultima.rota.localeCompare(b.ultima.rota) || porData(a, b)); out.proximos.sort(porData); out.depois.sort(porData)
  return out
}

/** Compatibilidade com o painel: retornos marcados, do mais próximo para o mais distante. */
export function retornosAgendados(visitas: VisitaExt[]) {
  const a = agenda(visitas, hojeSP(), 3650)
  return [...a.atrasados, ...a.hoje, ...a.proximos, ...a.semData].map((i) => i.ultima).filter((v) => !classificar(v).vendeu || dataRetorno(v))
}

export const brl = (v: number | string | null | undefined) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const pct = (v: number) => Math.round((v || 0) * 100) + '%'
export const num = (v: number | null | undefined, d = 0) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: d })

// ── Dashboard de gestão ─────────────────────────────────────────────────────
const diasEntreIso = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00Z').getTime() - new Date(a + 'T12:00:00Z').getTime()) / 864e5)

export interface RetornoFeito { visita: VisitaExt; previsto: string | null; atrasoDias: number }

/** Follow-ups feitos no período, comparados com a data de retorno marcada na visita anterior da mesma empresa. */
export function retornosFeitos(visitas: VisitaExt[], de: string, ate: string): RetornoFeito[] {
  const anterior = new Map<number, VisitaExt>()
  const out: RetornoFeito[] = []
  for (const v of [...visitas].sort(ordemVisita)) {
    const p = anterior.get(v.empresa_id)
    if (p && noPeriodo(v, de, ate)) {
      const previsto = dataRetorno(p)
      out.push({ visita: v, previsto, atrasoDias: previsto ? Math.max(0, diasEntreIso(previsto, v.data_visita)) : 0 })
    }
    anterior.set(v.empresa_id, v)
  }
  return out
}

export interface ResumoGestao extends Resumo {
  primeiras: number
  followups: number
  empresas: number
  retornosNoPrazo: number
  retornosAtrasados: number
  retornosSemAgenda: number
  atrasoMedio: number
  ticketMedio: number
  conversao: number
  oportunidades: number
  pecasOportunidade: number
  comRetornoMarcado: number
}

export function resumoGestao(todas: VisitaExt[], de: string, ate: string): ResumoGestao {
  const doPeriodo = todas.filter((v) => noPeriodo(v, de, ate))
  const base = agregar(doPeriodo)
  const ret = retornosFeitos(todas, de, ate)
  const agendados = ret.filter((r) => r.previsto)
  const atrasados = agendados.filter((r) => r.atrasoDias > 0)
  const ops = doPeriodo.filter((v) => (v.expectativa_pecas || 0) > 0 && (v.possibilidade === 'Alta' || v.possibilidade === 'Média') && !classificar(v).vendeu)
  return {
    ...base,
    primeiras: doPeriodo.length - ret.length,
    followups: ret.length,
    empresas: new Set(doPeriodo.map((v) => v.empresa_id)).size,
    retornosNoPrazo: agendados.length - atrasados.length,
    retornosAtrasados: atrasados.length,
    retornosSemAgenda: ret.length - agendados.length,
    atrasoMedio: atrasados.length ? atrasados.reduce((s, r) => s + r.atrasoDias, 0) / atrasados.length : 0,
    ticketMedio: base.vendas ? base.faturamento / base.vendas : 0,
    conversao: doPeriodo.length ? base.vendas / doPeriodo.length : 0,
    oportunidades: ops.length,
    pecasOportunidade: ops.reduce((s, v) => s + (v.expectativa_pecas || 0), 0),
    comRetornoMarcado: doPeriodo.filter((v) => dataRetorno(v)).length,
  }
}

export const diasDeAtraso = (data: string, hoje: string) => diasEntreIso(data, hoje)

export function porRota(visitas: VisitaExt[]) {
  const m = new Map<string, VisitaExt[]>()
  for (const v of visitas) { if (!m.has(v.rota)) m.set(v.rota, []); m.get(v.rota)!.push(v) }
  return Array.from(m.entries()).map(([rota, vs]) => ({ rota, ...agregar(vs) })).sort((a, b) => b.faturamento - a.faturamento || b.visitas - a.visitas)
}

// ── Linhas para as listas dos cards clicáveis ───────────────────────────────
export interface LinhaLista {
  id: number; data: string; hora: string | null; cliente: string; rota: string
  etiqueta?: string; cor?: 'sky' | 'gray' | 'indigo' | 'red' | 'emerald' | 'amber'; texto?: string | null; valor?: string | null
}

export function paraLinha(v: VisitaExt, extra: Partial<LinhaLista> = {}): LinhaLista {
  const fu = v.tipo === 'followup'
  return {
    id: v.id, data: v.data_visita, hora: v.hora_chegada, cliente: v.cliente, rota: v.rota,
    etiqueta: fu ? 'Follow-up' : '1ª visita', cor: fu ? 'sky' : 'gray',
    texto: [v.objetivo && `Objetivo: ${v.objetivo}`, v.obs, v.proximo_passo && `Próximo passo: ${v.proximo_passo}`].filter(Boolean).join(' · ') || null,
    valor: Number(v.faturamento) > 0 ? brl(v.faturamento) : v.expectativa_pecas ? `${num(v.expectativa_pecas)} peças` : null,
    ...extra,
  }
}

export const recentesPrimeiro = (a: LinhaLista, b: LinhaLista) => (b.data + (b.hora || '')).localeCompare(a.data + (a.hora || ''))
