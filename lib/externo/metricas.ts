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

export function classificar(v: Pick<VisitaExt, 'obs' | 'agendamento' | 'pecas_vendidas' | 'faturamento' | 'ja_comprou_laesc'>) {
  const obs = norm(v.obs)
  const vendeu = (v.pecas_vendidas || 0) > 0 || Number(v.faturamento || 0) > 0
  const ag = String(v.agendamento ?? '').trim()
  return {
    vendeu,
    clienteNovo: vendeu && norm(v.ja_comprou_laesc) === 'nao',
    proximoPasso: Boolean(ag) || PROX.test(obs) || vendeu,
    soMaterial: MATERIAL.test(obs) && !ag,
  }
}

export function semanaVazia(k: string): Semana {
  return { semana: k, rotulo: rotuloSemana(k), diasCampo: 0, visitas: 0, visitasDia: 0, duracaoMedia: null, vendas: 0, pecas: 0, faturamento: 0, clientesNovos: 0, pctProximoPasso: 0, pctSoMaterial: 0, expectativa: 0 }
}

export function porSemana(visitas: VisitaExt[]): Semana[] {
  const acc = new Map<string, { dias: Set<string>; dur: number[]; n: number; vendas: number; pecas: number; fat: number; novos: number; prox: number; mat: number; exp: number }>()
  for (const v of visitas) {
    const k = segundaDe(v.data_visita)
    if (!acc.has(k)) acc.set(k, { dias: new Set(), dur: [], n: 0, vendas: 0, pecas: 0, fat: 0, novos: 0, prox: 0, mat: 0, exp: 0 })
    const s = acc.get(k)!
    const c = classificar(v)
    s.dias.add(v.data_visita)
    s.n += 1
    if (v.duracao_min) s.dur.push(v.duracao_min)
    s.vendas += c.vendeu ? 1 : 0
    s.pecas += v.pecas_vendidas || 0
    s.fat += Number(v.faturamento || 0)
    s.novos += c.clienteNovo ? 1 : 0
    s.prox += c.proximoPasso ? 1 : 0
    s.mat += c.soMaterial ? 1 : 0
    s.exp += v.expectativa_pecas || 0
  }
  return Array.from(acc.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, s]) => ({
      semana: k,
      rotulo: rotuloSemana(k),
      diasCampo: s.dias.size,
      visitas: s.n,
      visitasDia: s.dias.size ? s.n / s.dias.size : 0,
      duracaoMedia: s.dur.length ? s.dur.reduce((a, b) => a + b, 0) / s.dur.length : null,
      vendas: s.vendas,
      pecas: s.pecas,
      faturamento: s.fat,
      clientesNovos: s.novos,
      pctProximoPasso: s.n ? s.prox / s.n : 0,
      pctSoMaterial: s.n ? s.mat / s.n : 0,
      expectativa: s.exp,
    }))
}

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

export function retornosAgendados(visitas: VisitaExt[]) {
  const ultimo = new Map<number, VisitaExt>()
  for (const v of visitas) ultimo.set(v.empresa_id, v)
  return Array.from(ultimo.values()).filter((v) => v.agendamento && !classificar(v).vendeu).reverse()
}

export const brl = (v: number | string | null | undefined) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const pct = (v: number) => Math.round((v || 0) * 100) + '%'
export const num = (v: number | null | undefined, d = 0) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: d })
