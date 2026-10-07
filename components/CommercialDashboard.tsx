'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DailySale, SalespersonTarget, TeamTarget, Role } from '@/lib/types'
import { Plus, X, Target, Users, Calendar, AlertTriangle, ChevronRight } from 'lucide-react'

// ── Formatação ──────────────────────────────────────────────────────────────
const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const PCT = (real: number, meta: number) =>
  meta > 0 ? (real / meta) * 100 : 0

const MONTH_NAMES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MONTH_SHORT = [
  '', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

// ── Calendário 2026 ─────────────────────────────────────────────────────────
// Feriados nacionais + RS + municipais Caçapava do Sul
const HOLIDAYS_2026 = new Set([
  '2026-01-01', // Ano Novo
  '2026-04-03', // Sexta-Feira Santa
  '2026-04-21', // Tiradentes
  '2026-05-01', // Dia do Trabalho
  '2026-06-04', // Corpus Christi
  '2026-09-07', // Independência do Brasil
  '2026-10-12', // Nossa Senhora Aparecida
  '2026-11-02', // Finados
  '2026-11-20', // Consciência Negra
  '2026-12-25', // Natal
])

function isWorkingDay(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  return day !== 0 && day !== 6 && !HOLIDAYS_2026.has(dateStr)
}

function getMondayStr(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function getWorkingDaysInMonth(year: number, month: number): string[] {
  const days: string[] = []
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (isWorkingDay(s)) days.push(s)
    d.setDate(d.getDate() + 1)
  }
  return days
}

interface WeekGroup {
  label: string
  days: string[]
}

function groupIntoWeeks(workingDays: string[]): WeekGroup[] {
  const map = new Map<string, string[]>()
  for (const d of workingDays) {
    const mon = getMondayStr(d)
    if (!map.has(mon)) map.set(mon, [])
    map.get(mon)!.push(d)
  }
  return Array.from(map.entries()).map(([, days], i) => ({
    label: `Sem ${i + 1}`,
    days,
  }))
}

function dateRangeLabel(days: string[]): string {
  if (days.length === 0) return ''
  const d1 = new Date(days[0] + 'T12:00:00')
  const d2 = new Date(days[days.length - 1] + 'T12:00:00')
  const m1 = MONTH_SHORT[d1.getMonth() + 1]
  const m2 = MONTH_SHORT[d2.getMonth() + 1]
  if (d1.getMonth() === d2.getMonth()) {
    return `${d1.getDate()}-${d2.getDate()}/${m1}`
  }
  return `${d1.getDate()}/${m1}-${d2.getDate()}/${m2}`
}

// ── Sub-componentes ─────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  const w = Math.min(pct, 100)
  const c =
    pct >= 100 ? 'bg-green-500' :
    pct >= 80  ? 'bg-indigo-500' :
    pct >= 50  ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${c}`} style={{ width: `${w}%` }} />
    </div>
  )
}

function KpiCard({
  title, value, sub, accent = false,
}: {
  title: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${accent ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-gray-200'}`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{title}</p>
      <p className={`text-xl font-bold leading-tight ${accent ? 'text-indigo-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Props ───────────────────────────────────────────────────────────────────
interface Props {
  initialSales: DailySale[]
  companyId: string
  currentUserName: string
  currentUserRole: Role
  salespersonTargets: SalespersonTarget[]
  teamTargets: TeamTarget[]
}

const AVAILABLE_MONTHS = [
  { year: 2026, month: 8 },
  { year: 2026, month: 9 },
  { year: 2026, month: 10 },
]

// ── Dashboard ───────────────────────────────────────────────────────────────
export default function CommercialDashboard({
  initialSales,
  companyId,
  currentUserName,
  currentUserRole,
  salespersonTargets,
  teamTargets,
}: Props) {
  const supabase = createClient()
  const isAdmin = currentUserRole === 'admin'

  const [sales, setSales]           = useState<DailySale[]>(initialSales)
  const [selYear, setSelYear]       = useState(2026)
  const [selMonth, setSelMonth]     = useState(10)
  const [selPerson, setSelPerson]   = useState<string>('geral')
  const [showForm, setShowForm]     = useState(false)
  const [formDate, setFormDate]     = useState(new Date().toISOString().slice(0, 10))
  const [formPerson, setFormPerson] = useState(currentUserName)
  const [formAmount, setFormAmount] = useState('')
  const [formTickets, setFormTickets] = useState('')
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState('')

  // Hoje
  const today = new Date().toISOString().split('T')[0]

  // Vendedores únicos
  const salespersons = useMemo(() => {
    const names = [
      ...salespersonTargets.map(t => t.salesperson_name),
      ...sales.map(s => s.salesperson_name),
    ]
    return [...new Set(names)].sort()
  }, [salespersonTargets, sales])

  // Dias úteis e semanas do mês selecionado
  const workingDays = useMemo(
    () => getWorkingDaysInMonth(selYear, selMonth),
    [selYear, selMonth]
  )
  const weekGroups = useMemo(() => groupIntoWeeks(workingDays), [workingDays])

  const isCurrentMonth = useMemo(() => {
    const now = new Date()
    return selYear === now.getFullYear() && selMonth === now.getMonth() + 1
  }, [selYear, selMonth])

  const daysElapsed   = useMemo(() => workingDays.filter(d => d <= today).length, [workingDays, today])
  const daysRemaining = useMemo(() => workingDays.filter(d => d > today).length, [workingDays, today])

  // Vendas do mês
  const monthPrefix = `${selYear}-${String(selMonth).padStart(2, '0')}`
  const monthSales = useMemo(
    () => sales.filter(s => s.sale_date.startsWith(monthPrefix)),
    [sales, monthPrefix]
  )

  // Vendas filtradas (geral ou por vendedor)
  const filteredSales = useMemo(
    () => selPerson === 'geral' ? monthSales : monthSales.filter(s => s.salesperson_name === selPerson),
    [monthSales, selPerson]
  )

  // Totais
  const monthlyTotal = useMemo(
    () => filteredSales.reduce((s, r) => s + r.total_amount, 0),
    [filteredSales]
  )
  const totalTickets = useMemo(
    () => filteredSales.reduce((s, r) => s + r.ticket_count, 0),
    [filteredSales]
  )

  // Meta
  const meta = useMemo(() => {
    if (selPerson === 'geral') {
      return teamTargets.find(t => t.year === selYear && t.month === selMonth)?.target_amount ?? 0
    }
    return salespersonTargets.find(
      t => t.salesperson_name === selPerson && t.year === selYear && t.month === selMonth
    )?.target_amount ?? 0
  }, [selPerson, selYear, selMonth, teamTargets, salespersonTargets])

  // Totais por semana
  const weeklyTotals = useMemo(
    () => weekGroups.map(wk =>
      filteredSales
        .filter(s => wk.days.includes(s.sale_date))
        .reduce((s, r) => s + r.total_amount, 0)
    ),
    [weekGroups, filteredSales]
  )

  // Meta proporcional por semana
  const weeklyMetas = useMemo(
    () => weekGroups.map(wk =>
      meta > 0 && workingDays.length > 0
        ? (meta / workingDays.length) * wk.days.length
        : 0
    ),
    [weekGroups, meta, workingDays.length]
  )

  // ── KPIs calculados ─────────────────────────────────────────────────────
  const pctMeta           = PCT(monthlyTotal, meta)
  const metaPorDia        = meta > 0 && workingDays.length > 0 ? meta / workingDays.length : 0
  const vendaPorDia       = daysElapsed > 0 ? monthlyTotal / daysElapsed : 0
  const ticketMedioPorDia = daysElapsed > 0 ? monthlyTotal / daysElapsed : 0
  const ticketMedioPorTx  = totalTickets > 0 ? monthlyTotal / totalTickets : 0

  const projecao = isCurrentMonth && daysElapsed > 0
    ? (monthlyTotal / daysElapsed) * workingDays.length
    : monthlyTotal

  const faltaParaMeta   = Math.max(meta - monthlyTotal, 0)
  const necessarioPorDia = isCurrentMonth && daysRemaining > 0 && meta > monthlyTotal
    ? faltaParaMeta / daysRemaining
    : 0

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    // Aceita vírgula como decimal
    const amt = parseFloat(formAmount.replace(/\./g, '').replace(',', '.'))
    const tix = parseInt(formTickets) || 0

    if (!amt || amt <= 0) {
      setFormError('Informe um valor válido (ex: 5.250,00).')
      setSaving(false)
      return
    }

    const payload = {
      company_id: companyId,
      salesperson_name: isAdmin ? (formPerson || currentUserName) : currentUserName,
      sale_date: formDate,
      total_amount: amt,
      ticket_count: tix,
    }

    const { data, error: err } = await supabase
      .from('daily_sales')
      .upsert(payload, { onConflict: 'company_id,salesperson_name,sale_date' })
      .select()
      .single()

    if (err) {
      setFormError('Erro ao salvar. Tente novamente.')
    } else {
      setSales(prev => {
        const idx = prev.findIndex(
          s => s.salesperson_name === data.salesperson_name && s.sale_date === data.sale_date
        )
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = data
          return updated
        }
        return [data, ...prev]
      })
      setShowForm(false)
      setFormAmount('')
      setFormTickets('')
    }
    setSaving(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comercial</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Olá, <span className="font-semibold text-gray-700">{currentUserName}</span> — acompanhe as vendas da equipe
          </p>
        </div>
        <button
          onClick={() => {
            setFormAmount('')
            setFormTickets('')
            setFormDate(today)
            setFormPerson(currentUserName)
            setFormError('')
            setShowForm(true)
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Registrar Vendas do Dia
        </button>
      </div>

      {/* Seletor de mês */}
      <div className="flex gap-2 flex-wrap">
        {AVAILABLE_MONTHS.map(({ year, month }) => {
          const active = selYear === year && selMonth === month
          return (
            <button
              key={`${year}-${month}`}
              onClick={() => { setSelYear(year); setSelMonth(month) }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {MONTH_SHORT[month]}/{year}
              {year === new Date().getFullYear() && month === new Date().getMonth() + 1 && (
                <span className="ml-1.5 text-xs opacity-75">• atual</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Seletor de vendedor */}
      <div className="flex gap-2 flex-wrap">
        {(['geral', ...salespersons] as string[]).map(name => (
          <button
            key={name}
            onClick={() => setSelPerson(name)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selPerson === name
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {name === 'geral' ? 'Geral (Time)' : name}
            {name === currentUserName && selPerson !== name && (
              <span className="ml-1 text-xs opacity-50">• você</span>
            )}
          </button>
        ))}
      </div>

      {/* KPI Cards — linha 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Total Vendido"
          value={BRL(monthlyTotal)}
          sub={`${workingDays.length} dias úteis no mês`}
          accent
        />
        <KpiCard
          title="Meta do Mês"
          value={meta > 0 ? BRL(meta) : 'Sem meta'}
          sub={metaPorDia > 0 ? `${BRL(metaPorDia)} por dia útil` : undefined}
        />
        <KpiCard
          title="% da Meta"
          value={meta > 0 ? `${pctMeta.toFixed(1)}%` : '—'}
          sub={meta > 0 ? (pctMeta >= 100 ? '✓ Meta atingida!' : `Faltam ${BRL(faltaParaMeta)}`) : undefined}
        />
      </div>

      {/* KPI Cards — linha 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Projeção do Mês"
          value={BRL(projecao)}
          sub={
            isCurrentMonth && daysElapsed > 0
              ? `baseado em ${daysElapsed} dias trabalhados`
              : 'mês encerrado'
          }
        />
        <KpiCard
          title="Necessário/Dia"
          value={
            isCurrentMonth && necessarioPorDia > 0
              ? BRL(necessarioPorDia)
              : pctMeta >= 100 ? '✓ Meta ok' : '—'
          }
          sub={
            isCurrentMonth && daysRemaining > 0
              ? `${daysRemaining} dias úteis restantes`
              : undefined
          }
        />
        <KpiCard
          title="Venda Média/Dia"
          value={BRL(vendaPorDia)}
          sub={
            totalTickets > 0
              ? `Ticket médio: ${BRL(ticketMedioPorTx)}`
              : `${daysElapsed} dias trabalhados`
          }
        />
      </div>

      {/* Barra de progresso geral */}
      {meta > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-800">
                {selPerson === 'geral' ? 'Time' : selPerson} — {MONTH_NAMES[selMonth]}/{selYear}
              </p>
              {isCurrentMonth && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Semana atual: {daysElapsed} de {workingDays.length} dias úteis decorridos
                </p>
              )}
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${pctMeta >= 100 ? 'text-green-600' : pctMeta >= 80 ? 'text-indigo-600' : pctMeta >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {pctMeta.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400">da meta</p>
            </div>
          </div>
          <ProgressBar pct={pctMeta} />
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-400">{BRL(monthlyTotal)}</span>
            <span className="text-xs text-gray-400">Meta: {BRL(meta)}</span>
          </div>
          {isCurrentMonth && projecao > 0 && meta > 0 && (
            <p className={`text-xs mt-2 font-medium ${projecao >= meta ? 'text-green-600' : 'text-amber-600'}`}>
              {projecao >= meta
                ? `↑ Projeção ${BRL(projecao)} — no caminho de bater a meta`
                : `↓ Projeção ${BRL(projecao)} — ${BRL(meta - projecao)} abaixo da meta`}
            </p>
          )}
        </div>
      )}

      {/* Tabela semanal */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">
            Resultado por Semana — {MONTH_NAMES[selMonth]}/{selYear}
            {selPerson !== 'geral' && <span className="text-gray-400"> · {selPerson}</span>}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">Semana</th>
                <th className="text-left px-4 py-3 font-medium">Período</th>
                <th className="text-center px-4 py-3 font-medium">Dias</th>
                <th className="text-right px-4 py-3 font-medium">Meta Sem.</th>
                <th className="text-right px-4 py-3 font-medium">Realizado</th>
                <th className="text-right px-4 py-3 font-medium">% Meta</th>
                <th className="text-right px-5 py-3 font-medium">Média/Dia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {weekGroups.map((wk, i) => {
                const real    = weeklyTotals[i] ?? 0
                const wkMeta  = weeklyMetas[i] ?? 0
                const pct     = PCT(real, wkMeta)
                const elapsed = wk.days.filter(d => d <= today).length
                const mediaDia = elapsed > 0 ? real / elapsed : 0
                const isFuture = wk.days.every(d => d > today)
                return (
                  <tr key={wk.label} className={`hover:bg-gray-50 transition-colors ${isFuture ? 'opacity-40' : ''}`}>
                    <td className="px-5 py-3.5 font-semibold text-gray-800">{wk.label}</td>
                    <td className="px-4 py-3.5 text-gray-500 tabular-nums text-xs">{dateRangeLabel(wk.days)}</td>
                    <td className="px-4 py-3.5 text-center text-gray-500">{wk.days.length}</td>
                    <td className="px-4 py-3.5 text-right text-gray-400 tabular-nums text-xs">
                      {wkMeta > 0 ? BRL(wkMeta) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-900 tabular-nums">
                      {real > 0 ? BRL(real) : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {wkMeta > 0 && real > 0 ? (
                        <span className={`font-bold ${pct >= 100 ? 'text-green-600' : pct >= 80 ? 'text-indigo-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                          {pct.toFixed(0)}%
                        </span>
                      ) : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-500 tabular-nums text-xs">
                      {mediaDia > 0 ? BRL(mediaDia) : <span className="text-gray-200">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td className="px-5 py-3 text-xs font-bold text-gray-600 uppercase">Total</td>
                <td className="px-4 py-3 text-xs text-gray-400">{workingDays.length} dias úteis</td>
                <td className="px-4 py-3 text-center font-semibold text-gray-700">{workingDays.length}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-500 tabular-nums">
                  {meta > 0 ? BRL(meta) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">{BRL(monthlyTotal)}</td>
                <td className="px-4 py-3 text-right">
                  {meta > 0 ? (
                    <span className={`font-bold text-sm ${pctMeta >= 100 ? 'text-green-600' : pctMeta >= 80 ? 'text-indigo-600' : pctMeta >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                      {pctMeta.toFixed(1)}%
                    </span>
                  ) : '—'}
                </td>
                <td className="px-5 py-3 text-right text-xs text-gray-500 tabular-nums">
                  {vendaPorDia > 0 ? BRL(vendaPorDia) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Cards individuais (só no modo Geral) */}
      {selPerson === 'geral' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Desempenho Individual — {MONTH_NAMES[selMonth]}/{selYear}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {salespersons.map(name => {
              const tgt = salespersonTargets.find(
                t => t.salesperson_name === name && t.year === selYear && t.month === selMonth
              )
              const personTotal = monthSales
                .filter(s => s.salesperson_name === name)
                .reduce((s, r) => s + r.total_amount, 0)
              const personMeta = tgt?.target_amount ?? 0
              const pct = PCT(personTotal, personMeta)
              const personNecessario = isCurrentMonth && daysRemaining > 0 && personMeta > personTotal
                ? (personMeta - personTotal) / daysRemaining : 0

              return (
                <div
                  key={name}
                  className={`bg-white rounded-xl border p-4 cursor-pointer hover:border-indigo-300 transition-all ${
                    name === currentUserName ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-200'
                  }`}
                  onClick={() => setSelPerson(name)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
                    <div className="flex items-center gap-1">
                      {name === currentUserName && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">você</span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">{BRL(personTotal)}</p>
                  {personMeta > 0 ? (
                    <>
                      <p className="text-xs text-gray-400 mb-2">meta: {BRL(personMeta)}</p>
                      <ProgressBar pct={pct} />
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-xs font-bold ${pct >= 100 ? 'text-green-600' : pct >= 80 ? 'text-indigo-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                          {pct.toFixed(1)}%
                        </p>
                        {personNecessario > 0 && (
                          <p className="text-xs text-gray-400">{BRL(personNecessario)}/dia</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Sem meta cadastrada</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modal: Registrar Vendas do Dia ─────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Registrar Vendas do Dia</h2>
                <p className="text-xs text-gray-400 mt-0.5">Insere ou atualiza o registro do dia</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-300 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Vendedor *</label>
                  <select
                    value={formPerson}
                    onChange={e => setFormPerson(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {salespersons.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Total de Vendas (R$) *</label>
                <input
                  type="text"
                  required
                  inputMode="decimal"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: 5.250,00"
                />
                <p className="text-xs text-gray-400 mt-1">Use vírgula para decimais (ex: 1.250,50)</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Qtd. Pedidos / Tickets</label>
                <input
                  type="number"
                  min="0"
                  value={formTickets}
                  onChange={e => setFormTickets(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0 (opcional)"
                />
              </div>
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {formError}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
