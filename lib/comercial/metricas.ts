// Indicadores do painel Comercial — mesmas regras da planilha CONTROLE_VENDAS_LAESC.
//
// Dias de venda   = dias úteis do mês até hoje (inclusive). Mês encerrado = todos.
// Dias que faltam = dias úteis depois de hoje.
// Média por dia   = faturamento ÷ dias de venda.
// Projeção        = média por dia × dias úteis do mês (mês encerrado = faturamento).
// Buscar por dia  = (meta − faturamento) ÷ dias que faltam.
// Ticket médio    = faturamento ÷ quantidade de vendas.
// Meta da semana  = meta do mês ÷ dias úteis × dias úteis da semana.

export const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
export const MESES_CURTO = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

// Feriados nacionais + 20/09 (Revolução Farroupilha, RS). Carnaval não entra (é ponto facultativo).
const FERIADOS = new Set([
  '2026-01-01', '2026-04-03', '2026-04-21', '2026-05-01', '2026-06-04', '2026-09-07', '2026-09-20',
  '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
  '2027-01-01', '2027-03-26', '2027-04-21', '2027-05-01', '2027-05-27', '2027-09-07', '2027-09-20',
  '2027-10-12', '2027-11-02', '2027-11-15', '2027-11-20', '2027-12-25',
])

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const pct = (v: number, casas = 1) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`
export const num = (v: number, casas = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export function hojeSP(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const data = (s: string) => new Date(s + 'T12:00:00')

export function diaUtil(s: string) {
  const dow = data(s).getDay()
  return dow !== 0 && dow !== 6 && !FERIADOS.has(s)
}
export const diaDaSemana = (s: string) => DIAS_SEMANA[data(s).getDay()]
export const dm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`

export function diasUteis(ano: number, mes: number): string[] {
  const out: string[] = []
  const d = new Date(ano, mes - 1, 1, 12)
  while (d.getMonth() === mes - 1) {
    const s = iso(d)
    if (diaUtil(s)) out.push(s)
    d.setDate(d.getDate() + 1)
  }
  return out
}

export interface Semana { rotulo: string; dias: string[] }
export function semanas(dias: string[]): Semana[] {
  const mapa = new Map<string, string[]>()
  for (const s of dias) {
    const d = data(s)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // segunda-feira
    const k = iso(d)
    if (!mapa.has(k)) mapa.set(k, [])
    mapa.get(k)!.push(s)
  }
  return Array.from(mapa.values()).map((dias, i) => ({ rotulo: `Semana ${i + 1}`, dias }))
}

export function periodo(dias: string[]) {
  if (!dias.length) return ''
  const a = dias[0], b = dias[dias.length - 1]
  return a === b ? dm(a) : `${dm(a)} a ${dm(b)}`
}

/** Meses de agosto/2026 até o mês atual (mais recente primeiro na exibição fica a cargo da tela). */
export function mesesDisponiveis(hoje: string, inicio = '2026-08'): { ano: number; mes: number }[] {
  const out: { ano: number; mes: number }[] = []
  let [a, m] = inicio.split('-').map(Number)
  const [ha, hm] = hoje.split('-').map(Number)
  while (a < ha || (a === ha && m <= hm)) {
    out.push({ ano: a, mes: m })
    m++
    if (m > 12) { m = 1; a++ }
  }
  return out
}

export interface Venda { salesperson_name: string; sale_date: string; total_amount: number; ticket_count: number }

export interface Indicadores {
  faturamento: number
  vendas: number
  meta: number
  metaDia: number
  pctMeta: number
  falta: number
  diasMes: number
  diasVenda: number
  diasFaltam: number
  mediaDia: number
  mediaVendasDia: number
  ticketMedio: number
  projecao: number
  pctProjecao: number
  buscarPorDia: number
  encerrado: boolean
  futuro: boolean
}

export function indicadores(vendas: Venda[], meta: number, dias: string[], hoje: string): Indicadores {
  const faturamento = vendas.reduce((s, v) => s + Number(v.total_amount || 0), 0)
  const qtd = vendas.reduce((s, v) => s + Number(v.ticket_count || 0), 0)
  const diasVenda = dias.filter((d) => d <= hoje).length
  const diasFaltam = dias.filter((d) => d > hoje).length
  const encerrado = diasFaltam === 0
  const futuro = diasVenda === 0
  const mediaDia = diasVenda ? faturamento / diasVenda : 0
  const projecao = encerrado ? faturamento : mediaDia * dias.length
  const falta = Math.max(meta - faturamento, 0)
  return {
    faturamento,
    vendas: qtd,
    meta,
    metaDia: dias.length ? meta / dias.length : 0,
    pctMeta: meta ? (faturamento / meta) * 100 : 0,
    falta,
    diasMes: dias.length,
    diasVenda,
    diasFaltam,
    mediaDia,
    mediaVendasDia: diasVenda ? qtd / diasVenda : 0,
    ticketMedio: qtd ? faturamento / qtd : 0,
    projecao,
    pctProjecao: meta ? (projecao / meta) * 100 : 0,
    buscarPorDia: diasFaltam && falta > 0 ? falta / diasFaltam : 0,
    encerrado,
    futuro,
  }
}

export interface LinhaSemana {
  rotulo: string
  periodo: string
  dias: number
  meta: number
  vendido: number
  vendas: number
  resultado: number
  pctMeta: number
  acumulado: number
  acumuladoIdeal: number
  pctAcumulado: number
  futura: boolean
}

export function porSemana(vendas: Venda[], meta: number, dias: string[], hoje: string): LinhaSemana[] {
  const metaDia = dias.length ? meta / dias.length : 0
  let acumulado = 0, ideal = 0
  return semanas(dias).map((s) => {
    const doPeriodo = vendas.filter((v) => s.dias.includes(v.sale_date))
    const vendido = doPeriodo.reduce((t, v) => t + Number(v.total_amount || 0), 0)
    const metaSem = metaDia * s.dias.length
    acumulado += vendido
    ideal += metaSem
    return {
      rotulo: s.rotulo,
      periodo: periodo(s.dias),
      dias: s.dias.length,
      meta: metaSem,
      vendido,
      vendas: doPeriodo.reduce((t, v) => t + Number(v.ticket_count || 0), 0),
      resultado: vendido - metaSem,
      pctMeta: metaSem ? (vendido / metaSem) * 100 : 0,
      acumulado,
      acumuladoIdeal: ideal,
      pctAcumulado: ideal ? (acumulado / ideal) * 100 : 0, // igual à planilha: acumulado ÷ acumulado ideal
      futura: s.dias[0] > hoje,
    }
  })
}

/** Aceita "1.250,50", "1250,50" ou "1250.50". */
export function lerValor(s: string): number {
  const t = s.trim().replace(/\s|R\$/g, '')
  if (!t) return NaN
  const n = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  return Number(n)
}
