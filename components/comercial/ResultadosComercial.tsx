'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { CalendarRange, AlertTriangle } from 'lucide-react'
import { brl, pct, num, dm, diaUtil, diasUteis, MESES_CURTO, type Venda } from '@/lib/comercial/metricas'

// Mesma lógica do dashboard do vendedor externo, aplicada à equipe interna:
// período livre, comparação com o período anterior, ranking, evolução e alertas.

type Meta = { salesperson_name: string; year: number; month: number; target_amount: number }
type MetaTime = { year: number; month: number; target_amount: number }

const iso = (d: Date) => d.toISOString().slice(0, 10)
const somar = (s: string, n: number) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d) }
const segunda = (s: string) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return iso(d) }
const diasEntre = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00Z').getTime() - new Date(a + 'T12:00:00Z').getTime()) / 864e5)
function uteisEntre(de: string, ate: string) {
  const out: string[] = []
  for (let d = de; d <= ate; d = somar(d, 1)) if (diaUtil(d)) out.push(d)
  return out
}

const ATALHOS = [
  { id: 'semana', rotulo: 'Esta semana' },
  { id: 'semana_passada', rotulo: 'Semana passada' },
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes_passado', rotulo: 'Mês passado' },
  { id: '30d', rotulo: 'Últimos 30 dias' },
  { id: 'tudo', rotulo: 'Desde o início' },
] as const

function periodo(atalho: string, hoje: string, livre?: { de: string; ate: string }) {
  let de: string, ate: string
  if (atalho === 'custom' && livre) { de = livre.de; ate = livre.ate }
  else {
    const seg = segunda(hoje)
    const mesIni = hoje.slice(0, 8) + '01'
    const fimPass = somar(mesIni, -1)
    const mapa: Record<string, [string, string]> = {
      semana: [seg, hoje], semana_passada: [somar(seg, -7), somar(seg, -1)], mes: [mesIni, hoje],
      mes_passado: [fimPass.slice(0, 8) + '01', fimPass], '30d': [somar(hoje, -29), hoje], tudo: ['2026-08-01', hoje],
    }
    ;[de, ate] = mapa[atalho] ?? mapa.mes
  }
  const dias = diasEntre(de, ate) + 1
  return { de, ate, antDe: somar(de, -dias), antAte: somar(de, -1) }
}

/** Meta proporcional aos dias úteis do período: soma, dia a dia, da meta do mês ÷ dias úteis do mês. */
function metaPeriodo(valorMes: (ano: number, mes: number) => number, de: string, ate: string) {
  const cache = new Map<string, number>()
  let total = 0
  for (const d of uteisEntre(de, ate)) {
    const ano = +d.slice(0, 4), mes = +d.slice(5, 7), k = d.slice(0, 7)
    if (!cache.has(k)) cache.set(k, diasUteis(ano, mes).length)
    total += valorMes(ano, mes) / (cache.get(k) || 1)
  }
  return total
}

/** Último dia que conta: o fim do período, ou hoje — mas hoje só conta depois que houver lançamento do dia. */
function ultimoDia(vendas: Venda[], ate: string, hoje: string) {
  if (ate < hoje) return ate
  return vendas.some((x) => x.sale_date === hoje) ? hoje : somar(hoje, -1)
}

function resumo(vendas: Venda[], de: string, ate: string, hoje: string) {
  const v = vendas.filter((x) => x.sale_date >= de && x.sale_date <= ate)
  const fat = v.reduce((s, x) => s + x.total_amount, 0)
  const qtd = v.reduce((s, x) => s + x.ticket_count, 0)
  const uteis = uteisEntre(de, ultimoDia(vendas, ate, hoje))
  const comVenda = new Set(v.filter((x) => x.total_amount > 0).map((x) => x.sale_date))
  const melhor = v.reduce<Venda | null>((m, x) => (!m || x.total_amount > m.total_amount ? x : m), null)
  return { fat, qtd, ticket: qtd ? fat / qtd : 0, mediaDia: uteis.length ? fat / uteis.length : 0, dias: uteis.length, diasSemVenda: uteis.filter((d) => !comVenda.has(d)).length, melhor }
}

function Tile({ titulo, valor, linha, cor }: { titulo: string; valor: string; linha?: React.ReactNode; cor?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 min-w-0">
      <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{titulo}</p>
      <p className={clsx('text-lg sm:text-2xl font-bold leading-tight tabular-nums', cor ?? 'text-gray-900')}>{valor}</p>
      {linha && <p className="text-xs text-gray-500 mt-1">{linha}</p>}
    </div>
  )
}
const corPct = (p: number) => (p >= 100 ? 'text-emerald-600' : p >= 80 ? 'text-indigo-600' : p >= 50 ? 'text-amber-600' : 'text-red-600')
const varia = (a: number, b: number, f: (x: number) => string) => (!b && !a ? null : <span className={a >= b ? 'text-emerald-700' : 'text-red-600'}>{a >= b ? '▲' : '▼'} {f(Math.abs(a - b))} vs. período anterior</span>)

function Painel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <h3 className="border-b border-gray-100 px-4 py-3 sm:px-5 text-sm font-semibold text-gray-800">{titulo}</h3>
      {children}
    </section>
  )
}

export default function ResultadosComercial({ vendas, metasVend, metasTime, hoje }: { vendas: Venda[]; metasVend: Meta[]; metasTime: MetaTime[]; hoje: string }) {
  const [atalho, setAtalho] = useState<string>('mes')
  const [livre, setLivre] = useState({ de: hoje.slice(0, 8) + '01', ate: hoje })
  const [abrirLivre, setAbrirLivre] = useState(false)
  const p = useMemo(() => periodo(atalho, hoje, livre), [atalho, hoje, livre])

  const metaDe = (nome: string) => (ano: number, mes: number) => metasVend.find((t) => t.salesperson_name === nome && t.year === ano && t.month === mes)?.target_amount ?? 0
  const metaTimeMes = (ano: number, mes: number) => metasTime.find((t) => t.year === ano && t.month === mes)?.target_amount
    ?? metasVend.filter((t) => t.year === ano && t.month === mes).reduce((s, t) => s + t.target_amount, 0)

  const nomes = useMemo(() => Array.from(new Set([...vendas.filter((v) => v.sale_date >= p.de && v.sale_date <= p.ate).map((v) => v.salesperson_name),
    ...metasVend.filter((t) => `${t.year}-${String(t.month).padStart(2, '0')}` >= p.de.slice(0, 7) && `${t.year}-${String(t.month).padStart(2, '0')}` <= p.ate.slice(0, 7)).map((t) => t.salesperson_name)])).sort((a, b) => a.localeCompare(b, 'pt-BR')), [vendas, metasVend, p])

  const fimEfetivo = ultimoDia(vendas, p.ate, hoje)
  const t = resumo(vendas, p.de, p.ate, hoje)
  const ta = resumo(vendas, p.antDe, p.antAte, hoje)
  const metaT = metaPeriodo(metaTimeMes, p.de, fimEfetivo)
  const metaTCheia = metaPeriodo(metaTimeMes, p.de, p.ate)
  const pctT = metaT ? (t.fat / metaT) * 100 : 0

  const ranking = nomes.map((nome) => {
    const v = vendas.filter((x) => x.salesperson_name === nome)
    const r = resumo(v, p.de, p.ate, hoje)
    const ra = resumo(v, p.antDe, p.antAte, hoje)
    const meta = metaPeriodo(metaDe(nome), p.de, ultimoDia(v, p.ate, hoje))
    // Lançamentos pendentes: dias úteis já passados do período sem nenhum registro da vendedora.
    const lancados = new Set(v.map((x) => x.sale_date))
    const mesesAtivos = new Set([...v.map((x) => x.sale_date.slice(0, 7)), ...metasVend.filter((m) => m.salesperson_name === nome).map((m) => `${m.year}-${String(m.month).padStart(2, '0')}`)])
    const pendentes = uteisEntre(p.de, p.ate < hoje ? p.ate : hoje).filter((d) => d < hoje && mesesAtivos.has(d.slice(0, 7)) && !lancados.has(d))
    return { nome, ...r, ant: ra, meta, pct: meta ? (r.fat / meta) * 100 : 0, participacao: t.fat ? r.fat / t.fat : 0, pendentes }
  }).sort((a, b) => b.fat - a.fat)

  // Evolução semanal (equipe e por vendedora)
  const semanasLista: string[] = []
  for (let s = segunda(p.de); s <= p.ate; s = somar(s, 7)) semanasLista.push(s)
  const semanasMostrar = semanasLista.length > 12 ? semanasLista.slice(-12) : semanasLista

  // Evolução mensal desde agosto
  const meses: { ano: number; mes: number }[] = []
  for (let a = 2026, m = 8; a < +hoje.slice(0, 4) || (a === +hoje.slice(0, 4) && m <= +hoje.slice(5, 7)); m === 12 ? (m = 1, a++) : m++) meses.push({ ano: a, mes: m })

  const alertas = ranking.filter((r) => r.meta > 0 && r.pct < 80)
  const pendentes = ranking.filter((r) => r.pendentes.length > 0)

  return (
    <div className="space-y-5">
      {/* Período */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {ATALHOS.map((a) => (
            <button key={a.id} onClick={() => { setAtalho(a.id); setAbrirLivre(false) }} className={clsx('shrink-0 rounded-full border px-3 py-1.5 text-sm', atalho === a.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700')}>{a.rotulo}</button>
          ))}
          <button onClick={() => setAbrirLivre(!abrirLivre)} className={clsx('shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm', atalho === 'custom' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700')}><CalendarRange className="w-4 h-4" />Escolher datas</button>
        </div>
        {abrirLivre && (
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-3">
            <label className="grid gap-1 text-xs font-semibold text-gray-600">De<input type="date" value={livre.de} max={livre.ate} onChange={(e) => setLivre({ ...livre, de: e.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-base sm:text-sm" /></label>
            <label className="grid gap-1 text-xs font-semibold text-gray-600">Até<input type="date" value={livre.ate} min={livre.de} onChange={(e) => setLivre({ ...livre, ate: e.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-base sm:text-sm" /></label>
            <button onClick={() => setAtalho('custom')} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Aplicar</button>
          </div>
        )}
        <p className="text-sm text-gray-500">{dm(p.de)}/{p.de.slice(2, 4)} a {dm(p.ate)}/{p.ate.slice(2, 4)} · comparação com {dm(p.antDe)} a {dm(p.antAte)}</p>
      </div>

      {/* Indicadores da equipe */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Tile titulo="Faturamento da equipe" valor={brl(t.fat)} linha={varia(t.fat, ta.fat, brl)} />
        <Tile titulo="% da meta no período" valor={metaT ? pct(pctT) : '—'} cor={metaT ? corPct(pctT) : undefined} linha={metaT ? `Meta proporcional até ${dm(fimEfetivo)}: ${brl(metaT)}${metaTCheia > metaT ? ` · período inteiro: ${brl(metaTCheia)}` : ''}` : 'Sem meta cadastrada'} />
        <Tile titulo="Quantidade de vendas" valor={num(t.qtd)} linha={varia(t.qtd, ta.qtd, (x) => num(x))} />
        <Tile titulo="Ticket médio" valor={t.qtd ? brl(t.ticket) : '—'} linha={ta.qtd ? varia(t.ticket, ta.ticket, brl) : undefined} />
        <Tile titulo="Média por dia útil" valor={brl(t.mediaDia)} linha={`${t.dias} dia(s) útil(eis) no período`} />
        <Tile titulo="Vendas por dia" valor={t.dias ? num(t.qtd / t.dias, 1) : '—'} linha="Quantidade ÷ dias úteis" />
        <Tile titulo="Melhor dia" valor={t.melhor && t.melhor.total_amount > 0 ? brl(t.melhor.total_amount) : '—'} linha={t.melhor && t.melhor.total_amount > 0 ? `${t.melhor.salesperson_name} em ${dm(t.melhor.sale_date)}` : undefined} />
        <Tile titulo="Lançamentos pendentes" valor={num(pendentes.reduce((s, r) => s + r.pendentes.length, 0))} cor={pendentes.length ? 'text-red-600' : 'text-emerald-600'} linha="Dias úteis já passados sem registro" />
      </div>

      {/* Alertas */}
      {(alertas.length > 0 || pendentes.length > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle className="w-4 h-4" />Pontos de atenção</p>
          {alertas.map((r) => <p key={'a' + r.nome} className="text-sm text-amber-900">{r.nome}: {pct(r.pct)} da meta do período — faltam {brl(Math.max(r.meta - r.fat, 0))} para o ritmo ideal.</p>)}
          {pendentes.map((r) => <p key={'p' + r.nome} className="text-sm text-amber-900">{r.nome}: {r.pendentes.length} dia(s) sem lançamento ({r.pendentes.slice(-5).map(dm).join(', ')}{r.pendentes.length > 5 ? '…' : ''}).</p>)}
        </div>
      )}

      {/* Ranking */}
      <Painel titulo="Ranking das vendedoras no período">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead><tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2 text-left font-medium">#</th><th className="px-3 py-2 text-left font-medium">Vendedora</th>
              <th className="px-3 py-2 text-right font-medium">Faturamento</th><th className="px-3 py-2 text-right font-medium">% meta</th>
              <th className="px-3 py-2 text-right font-medium">Vendas</th><th className="px-3 py-2 text-right font-medium">Ticket</th>
              <th className="px-3 py-2 text-right font-medium">Média/dia</th><th className="px-3 py-2 text-right font-medium">Dias sem venda</th>
              <th className="px-3 py-2 text-right font-medium">Participação</th><th className="px-4 py-2 text-right font-medium">vs. anterior</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {ranking.map((r, i) => (
                <tr key={r.nome}>
                  <td className="px-4 py-2 text-gray-400">{i + 1}º</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{r.nome}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{brl(r.fat)}</td>
                  <td className={clsx('px-3 py-2 text-right tabular-nums font-semibold', r.meta ? corPct(r.pct) : 'text-gray-400')}>{r.meta ? pct(r.pct) : 'sem meta'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(r.qtd)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.qtd ? brl(r.ticket) : '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{brl(r.mediaDia)}</td>
                  <td className={clsx('px-3 py-2 text-right tabular-nums', r.diasSemVenda > r.dias / 3 ? 'text-red-600' : 'text-gray-600')}>{r.diasSemVenda} de {r.dias}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{pct(r.participacao * 100, 0)}</td>
                  <td className={clsx('px-4 py-2 text-right tabular-nums', r.fat >= r.ant.fat ? 'text-emerald-700' : 'text-red-600')}>{r.ant.fat ? `${r.fat >= r.ant.fat ? '+' : '−'}${pct(Math.abs((r.fat / r.ant.fat - 1) * 100), 0)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Painel>

      {/* Evolução semanal */}
      <Painel titulo="Evolução por semana">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead><tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2 text-left font-medium">Semana</th>
              {ranking.map((r) => <th key={r.nome} className="px-3 py-2 text-right font-medium normal-case">{r.nome}</th>)}
              <th className="px-3 py-2 text-right font-medium">Equipe</th><th className="px-3 py-2 text-right font-medium">Vendas</th><th className="px-4 py-2 text-right font-medium">Ticket</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {semanasMostrar.map((s) => {
                const fim = somar(s, 6)
                const daSemana = vendas.filter((v) => v.sale_date >= s && v.sale_date <= fim && v.sale_date >= p.de && v.sale_date <= p.ate)
                const tot = daSemana.reduce((x, v) => x + v.total_amount, 0)
                const q = daSemana.reduce((x, v) => x + v.ticket_count, 0)
                return (
                  <tr key={s}>
                    <td className="px-4 py-2 text-gray-700">{dm(s)}–{dm(fim)}</td>
                    {ranking.map((r) => <td key={r.nome} className="px-3 py-2 text-right tabular-nums text-gray-600">{brl(daSemana.filter((v) => v.salesperson_name === r.nome).reduce((x, v) => x + v.total_amount, 0))}</td>)}
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">{brl(tot)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(q)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{q ? brl(tot / q) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Painel>

      {/* Evolução mensal */}
      <Painel titulo="Evolução mês a mês">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead><tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2 text-left font-medium">Mês</th><th className="px-3 py-2 text-right font-medium">Meta</th><th className="px-3 py-2 text-right font-medium">Faturamento</th>
              <th className="px-3 py-2 text-right font-medium">% meta</th><th className="px-3 py-2 text-right font-medium">Vendas</th><th className="px-3 py-2 text-right font-medium">Ticket</th><th className="px-4 py-2 text-right font-medium">Média/dia</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {meses.map(({ ano, mes }) => {
                const ini = `${ano}-${String(mes).padStart(2, '0')}-01`
                const fim = somar(`${mes === 12 ? ano + 1 : ano}-${String(mes === 12 ? 1 : mes + 1).padStart(2, '0')}-01`, -1)
                const r = resumo(vendas, ini, fim, hoje)
                const meta = metaTimeMes(ano, mes)
                const atual = hoje.slice(0, 7) === ini.slice(0, 7)
                return (
                  <tr key={ini}>
                    <td className="px-4 py-2 text-gray-800">{MESES_CURTO[mes]}/{ano}{atual && <span className="ml-1 text-xs text-gray-400">(em andamento)</span>}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-500">{meta ? brl(meta) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{brl(r.fat)}</td>
                    <td className={clsx('px-3 py-2 text-right tabular-nums font-semibold', meta ? corPct((r.fat / meta) * 100) : 'text-gray-400')}>{meta ? pct((r.fat / meta) * 100) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(r.qtd)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.qtd ? brl(r.ticket) : '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{brl(r.mediaDia)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Painel>
    </div>
  )
}
