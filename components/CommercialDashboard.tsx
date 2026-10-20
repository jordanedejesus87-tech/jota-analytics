'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { Plus, X, Users, Calendar, AlertTriangle, ChevronRight, Target, CalendarDays, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ResultadosComercial from '@/components/comercial/ResultadosComercial'
import type { DailySale, SalespersonTarget, TeamTarget, Role } from '@/lib/types'
import {
  MESES, MESES_CURTO, brl, pct, num, dm, diaDaSemana, diasUteis, semanas, indicadores, porSemana,
  mesesDisponiveis, lerValor, type Venda,
} from '@/lib/comercial/metricas'

// Cores ficam aqui (e não em lib/) para o Tailwind sempre gerar as classes.
export function corPct(p: number) {
  return p >= 100 ? 'text-emerald-600' : p >= 80 ? 'text-indigo-600' : p >= 50 ? 'text-amber-600' : 'text-red-600'
}
export function corBarra(p: number) {
  return p >= 100 ? 'bg-emerald-500' : p >= 80 ? 'bg-indigo-500' : p >= 50 ? 'bg-amber-500' : 'bg-red-400'
}


// ── Peças visuais ───────────────────────────────────────────────────────────
function Barra({ p }: { p: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={clsx('h-2 rounded-full transition-all', corBarra(p))} style={{ width: `${Math.min(Math.max(p, 0), 100)}%` }} />
    </div>
  )
}

function Kpi({ titulo, valor, linha, destaque, cor }: { titulo: string; valor: string; linha?: string; destaque?: boolean; cor?: string }) {
  return (
    <div className={clsx('bg-white rounded-xl border p-3 sm:p-4 min-w-0', destaque ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-gray-200')}>
      <p className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{titulo}</p>
      <p className={clsx('text-lg sm:text-xl font-bold leading-tight tabular-nums break-words', cor ?? (destaque ? 'text-indigo-700' : 'text-gray-900'))}>{valor}</p>
      {linha && <p className="text-xs text-gray-500 mt-1">{linha}</p>}
    </div>
  )
}

const n = (v: unknown) => Number(v ?? 0)

// ── Props ───────────────────────────────────────────────────────────────────
interface Props {
  initialSales: DailySale[]
  companyId: string
  currentUserName: string
  currentUserRole: Role
  salespersonTargets: SalespersonTarget[]
  teamTargets: TeamTarget[]
  hoje: string
}

export default function CommercialDashboard({ initialSales, companyId, currentUserName, currentUserRole, salespersonTargets, teamTargets, hoje }: Props) {
  const supabase = createClient()
  const gestor = currentUserRole === 'admin' || currentUserRole === 'system'
  const podeLancar = gestor || currentUserRole === 'commercial'

  const [sales, setSales] = useState<Venda[]>(() => initialSales.map((s) => ({ ...s, total_amount: n(s.total_amount), ticket_count: n(s.ticket_count) })))
  const [metasVend, setMetasVend] = useState(() => salespersonTargets.map((t) => ({ ...t, target_amount: n(t.target_amount) })))
  const [metasTime, setMetasTime] = useState(() => teamTargets.map((t) => ({ ...t, target_amount: n(t.target_amount) })))

  const meses = useMemo(() => mesesDisponiveis(hoje), [hoje])
  const [sel, setSel] = useState(() => meses[meses.length - 1])
  const [pessoa, setPessoa] = useState<string>('geral')
  const [aba, setAba] = useState<'mes' | 'resultados'>('mes')

  // Lançamento de vendas
  const [form, setForm] = useState<null | { data: string; vendedor: string; valor: string; qtd: string }>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  // Cadastro de metas
  const [editMetas, setEditMetas] = useState<null | { time: string; vend: Record<string, string>; novo: string }>(null)

  const prefixo = `${sel.ano}-${String(sel.mes).padStart(2, '0')}`
  const dias = useMemo(() => diasUteis(sel.ano, sel.mes), [sel])
  const vendasMes = useMemo(() => sales.filter((s) => s.sale_date.startsWith(prefixo)), [sales, prefixo])

  const metaDe = (nome: string) => metasVend.find((t) => t.salesperson_name === nome && t.year === sel.ano && t.month === sel.mes)?.target_amount ?? 0
  const vendedores = useMemo(() => {
    const nomes = new Set<string>()
    metasVend.filter((t) => t.year === sel.ano && t.month === sel.mes).forEach((t) => nomes.add(t.salesperson_name))
    vendasMes.forEach((v) => nomes.add(v.salesperson_name))
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [metasVend, vendasMes, sel])
  const todosVendedores = useMemo(() => Array.from(new Set([...metasVend.map((t) => t.salesperson_name), ...sales.map((s) => s.salesperson_name)])).sort((a, b) => a.localeCompare(b, 'pt-BR')), [metasVend, sales])

  const metaTime = metasTime.find((t) => t.year === sel.ano && t.month === sel.mes)?.target_amount ?? vendedores.reduce((s, v) => s + metaDe(v), 0)
  const filtradas = pessoa === 'geral' ? vendasMes : vendasMes.filter((v) => v.salesperson_name === pessoa)
  const meta = pessoa === 'geral' ? metaTime : metaDe(pessoa)
  const k = indicadores(filtradas, meta, dias, hoje)
  const linhasSemana = porSemana(filtradas, meta, dias, hoje)
  const nomeVisao = pessoa === 'geral' ? 'Time' : pessoa

  // Tabela diária
  const linhasDia = dias.map((d) => {
    const doDia = filtradas.filter((v) => v.sale_date === d)
    const total = doDia.reduce((s, v) => s + v.total_amount, 0)
    const qtd = doDia.reduce((s, v) => s + v.ticket_count, 0)
    return { d, total, qtd, lancado: doDia.length > 0, porVendedor: Object.fromEntries(vendedores.map((p) => [p, doDia.find((v) => v.salesperson_name === p)])) }
  })
  const semanaDo = new Map(semanas(dias).flatMap((s, i) => s.dias.map((d) => [d, i + 1] as const)))

  const podeEditarDe = (nome: string) => gestor || (currentUserRole === 'commercial' && nome === currentUserName)

  function abrirLancamento(data = hoje <= dias[dias.length - 1] && hoje >= dias[0] ? hoje : dias[dias.length - 1], vendedor?: string) {
    const quem = vendedor ?? (gestor ? (pessoa !== 'geral' ? pessoa : todosVendedores[0] ?? currentUserName) : currentUserName)
    const atual = sales.find((s) => s.salesperson_name === quem && s.sale_date === data)
    setErro('')
    setForm({ data, vendedor: quem, valor: atual ? num(atual.total_amount, 2) : '', qtd: atual ? String(atual.ticket_count) : '' })
  }

  async function salvarLancamento(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const valor = lerValor(form.valor)
    const qtd = form.qtd.trim() === '' ? 0 : parseInt(form.qtd, 10)
    if (!Number.isFinite(valor) || valor < 0) return setErro('Informe o valor vendido no dia (ex.: 5.250,00). Use 0 se não houve venda.')
    if (!Number.isFinite(qtd) || qtd < 0) return setErro('Quantidade de vendas inválida.')
    if (valor > 0 && qtd === 0) return setErro('Informe também a quantidade de vendas do dia — sem ela o ticket médio fica errado.')
    setSalvando(true)
    setErro('')
    const payload = { company_id: companyId, salesperson_name: gestor ? form.vendedor : currentUserName, sale_date: form.data, total_amount: valor, ticket_count: qtd }
    const { data, error } = await supabase.from('daily_sales').upsert(payload, { onConflict: 'company_id,salesperson_name,sale_date' }).select().single()
    setSalvando(false)
    if (error || !data) return setErro('Não foi possível salvar. Tente novamente.')
    const linha: Venda = { ...data, total_amount: n(data.total_amount), ticket_count: n(data.ticket_count) }
    setSales((prev) => [linha, ...prev.filter((s) => !(s.salesperson_name === linha.salesperson_name && s.sale_date === linha.sale_date))])
    setForm(null)
  }

  function abrirMetas() {
    setErro('')
    setEditMetas({
      time: metasTime.find((t) => t.year === sel.ano && t.month === sel.mes) ? num(metaTime, 2) : '',
      vend: Object.fromEntries(Array.from(new Set([...vendedores, ...todosVendedores])).map((v) => [v, metaDe(v) ? num(metaDe(v), 2) : ''])),
      novo: '',
    })
  }

  async function salvarMetas(e: React.FormEvent) {
    e.preventDefault()
    if (!editMetas) return
    const vend = Object.entries(editMetas.vend).filter(([, v]) => v.trim() !== '').map(([nome, v]) => ({ nome, valor: lerValor(v) }))
    if (vend.some((v) => !Number.isFinite(v.valor) || v.valor < 0)) return setErro('Há uma meta com valor inválido.')
    const somaVend = vend.reduce((s, v) => s + v.valor, 0)
    const time = editMetas.time.trim() === '' ? somaVend : lerValor(editMetas.time)
    if (!Number.isFinite(time) || time < 0) return setErro('Meta do time inválida.')
    setSalvando(true)
    setErro('')
    const r1 = vend.length
      ? await supabase.from('salesperson_targets').upsert(vend.map((v) => ({ company_id: companyId, salesperson_name: v.nome, year: sel.ano, month: sel.mes, target_amount: v.valor })), { onConflict: 'company_id,salesperson_name,year,month' }).select()
      : { data: [], error: null }
    const r2 = await supabase.from('team_targets').upsert({ company_id: companyId, year: sel.ano, month: sel.mes, target_amount: time }, { onConflict: 'company_id,year,month' }).select()
    setSalvando(false)
    if (r1.error || r2.error) return setErro('Não foi possível salvar as metas. Tente novamente.')
    setMetasVend((prev) => [
      ...prev.filter((t) => !(t.year === sel.ano && t.month === sel.mes && vend.some((v) => v.nome === t.salesperson_name))),
      ...(r1.data ?? []).map((t: SalespersonTarget) => ({ ...t, target_amount: n(t.target_amount) })),
    ])
    setMetasTime((prev) => [...prev.filter((t) => !(t.year === sel.ano && t.month === sel.mes)), ...(r2.data ?? []).map((t: TeamTarget) => ({ ...t, target_amount: n(t.target_amount) }))])
    setEditMetas(null)
  }

  const situacao = k.futuro
    ? 'Mês ainda não começou'
    : k.encerrado
      ? `Mês encerrado · ${k.diasMes} dias úteis`
      : `${k.diasVenda} de ${k.diasMes} dias úteis · faltam ${k.diasFaltam}`

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto pb-24">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comercial</h1>
          <p className="text-sm text-gray-500 mt-0.5">Olá, <span className="font-semibold text-gray-700">{currentUserName}</span> — vendas, metas e projeção da equipe</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {gestor && (
            <button onClick={abrirMetas} className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg">
              <Target className="w-4 h-4" /> Metas do mês
            </button>
          )}
          {podeLancar && (
            <button onClick={() => abrirLancamento()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              <Plus className="w-4 h-4" /> Registrar vendas do dia
            </button>
          )}
        </div>
      </div>

      {/* Visões */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-full sm:w-fit">
        {([['mes', 'Acompanhamento do mês'], ['resultados', 'Resultados por período']] as const).map(([id, rotulo]) => (
          <button key={id} onClick={() => setAba(id)} className={clsx('flex-1 sm:flex-none rounded-lg px-4 py-2 text-sm font-semibold', aba === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{rotulo}</button>
        ))}
      </div>

      {aba === 'resultados' && <ResultadosComercial vendas={sales} metasVend={metasVend} metasTime={metasTime} hoje={hoje} />}

      {aba === 'mes' && (<>
      {/* Mês */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {meses.map((m) => {
          const ativo = m.ano === sel.ano && m.mes === sel.mes
          const atual = `${m.ano}-${String(m.mes).padStart(2, '0')}` === hoje.slice(0, 7)
          return (
            <button key={`${m.ano}-${m.mes}`} onClick={() => setSel(m)} className={clsx('shrink-0 px-4 py-2 rounded-lg text-sm font-semibold', ativo ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {MESES_CURTO[m.mes]}/{m.ano}{atual && <span className="ml-1.5 text-xs opacity-75">• atual</span>}
            </button>
          )
        })}
      </div>

      {/* Vendedor */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {['geral', ...vendedores].map((nome) => (
          <button key={nome} onClick={() => setPessoa(nome)} className={clsx('shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium', pessoa === nome ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {nome === 'geral' ? 'Geral (time)' : nome}
            {nome === currentUserName && pessoa !== nome && <span className="ml-1 text-xs opacity-50">• você</span>}
          </button>
        ))}
      </div>
      {pessoa !== 'geral' && !vendedores.includes(pessoa) && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{pessoa} não tem meta nem vendas em {MESES[sel.mes]}. <button className="underline" onClick={() => setPessoa('geral')}>Ver o time</button></p>
      )}

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi titulo="Faturamento atual" valor={brl(k.faturamento)} linha={situacao} destaque />
        <Kpi titulo="Meta do mês" valor={meta ? brl(meta) : 'Sem meta'} linha={meta ? `Meta por dia: ${brl(k.metaDia)}` : gestor ? 'Cadastre em "Metas do mês"' : undefined} />
        <Kpi titulo="% da meta" valor={meta ? pct(k.pctMeta) : '—'} cor={meta ? corPct(k.pctMeta) : undefined} linha={meta ? (k.falta > 0 ? `Falta da meta: ${brl(k.falta)}` : 'Meta atingida') : undefined} />
        <Kpi titulo="Projeção do mês" valor={brl(k.projecao)} cor={meta ? corPct(k.pctProjecao) : undefined} linha={k.encerrado ? 'Mês encerrado = faturamento' : meta ? `${pct(k.pctProjecao)} da meta no ritmo atual` : 'No ritmo atual'} />
        <Kpi titulo="Buscar por dia" valor={k.encerrado || k.futuro ? '—' : k.falta <= 0 ? 'Meta ok' : brl(k.buscarPorDia)} linha={k.encerrado ? 'Mês encerrado' : `${k.diasFaltam} dia(s) úteis para acabar o mês`} />
        <Kpi titulo="Média por dia" valor={brl(k.mediaDia)} linha={`${k.diasVenda} dia(s) de venda`} />
        <Kpi titulo="Quantidade de vendas" valor={num(k.vendas)} linha={`${num(k.mediaVendasDia, 1)} venda(s) por dia`} />
        <Kpi titulo="Ticket médio do mês" valor={k.vendas ? brl(k.ticketMedio) : '—'} linha="Faturamento ÷ nº de vendas" />
      </div>

      {/* Barra */}
      {meta > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 gap-3">
            <div>
              <p className="text-sm font-bold text-gray-800">{nomeVisao} — {MESES[sel.mes]}/{sel.ano}</p>
              <p className="text-xs text-gray-500 mt-0.5">Produzido {brl(k.faturamento)} de {brl(meta)}</p>
            </div>
            <p className={clsx('text-2xl font-bold tabular-nums', corPct(k.pctMeta))}>{pct(k.pctMeta)}</p>
          </div>
          <Barra p={k.pctMeta} />
          {!k.encerrado && !k.futuro && (
            <p className={clsx('text-xs mt-2 font-medium', k.projecao >= meta ? 'text-emerald-600' : 'text-amber-700')}>
              {k.projecao >= meta ? `No ritmo atual o mês fecha em ${brl(k.projecao)} — meta batida.` : `No ritmo atual o mês fecha em ${brl(k.projecao)} — ${brl(meta - k.projecao)} abaixo da meta. Para chegar, é preciso vender ${brl(k.buscarPorDia)} por dia.`}
            </p>
          )}
        </div>
      )}

      {/* Semanas */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Faturamento por semana · {nomeVisao}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium">Semana</th>
                <th className="text-center px-3 py-2.5 font-medium">Dias</th>
                <th className="text-right px-3 py-2.5 font-medium">Meta semana</th>
                <th className="text-right px-3 py-2.5 font-medium">Vendido</th>
                <th className="text-right px-3 py-2.5 font-medium">Resultado</th>
                <th className="text-right px-3 py-2.5 font-medium">% meta</th>
                <th className="text-right px-3 py-2.5 font-medium">Acumulado</th>
                <th className="text-right px-3 py-2.5 font-medium">Acum. ideal</th>
                <th className="text-right px-4 py-2.5 font-medium">% acum.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {linhasSemana.map((s) => (
                <tr key={s.rotulo} className={clsx(s.futura && 'opacity-40')}>
                  <td className="px-4 py-2.5"><span className="font-semibold text-gray-800">{s.rotulo}</span> <span className="text-xs text-gray-400">{s.periodo}</span></td>
                  <td className="px-3 py-2.5 text-center text-gray-500">{s.dias}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500 tabular-nums">{meta ? brl(s.meta) : '—'}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-gray-900 tabular-nums">{s.futura ? '—' : brl(s.vendido)}</td>
                  <td className={clsx('px-3 py-2.5 text-right tabular-nums', s.resultado >= 0 ? 'text-emerald-600' : 'text-red-600')}>{s.futura || !meta ? '—' : `${s.resultado >= 0 ? '+' : '−'}${brl(Math.abs(s.resultado))}`}</td>
                  <td className={clsx('px-3 py-2.5 text-right font-bold tabular-nums', corPct(s.pctMeta))}>{s.futura || !meta ? '—' : pct(s.pctMeta, 0)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700 tabular-nums">{s.futura ? '—' : brl(s.acumulado)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500 tabular-nums">{meta ? brl(s.acumuladoIdeal) : '—'}</td>
                  <td className={clsx('px-4 py-2.5 text-right font-semibold tabular-nums', meta && !s.futura ? corPct(s.pctAcumulado) : 'text-gray-400')}>{s.futura || !meta ? '—' : pct(s.pctAcumulado)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                <td className="px-4 py-2.5 text-xs uppercase text-gray-600">Total</td>
                <td className="px-3 py-2.5 text-center text-gray-700">{k.diasMes}</td>
                <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">{meta ? brl(meta) : '—'}</td>
                <td className="px-3 py-2.5 text-right text-gray-900 tabular-nums">{brl(k.faturamento)}</td>
                <td className={clsx('px-3 py-2.5 text-right tabular-nums', k.faturamento - meta >= 0 ? 'text-emerald-600' : 'text-red-600')}>{meta ? `${k.faturamento - meta >= 0 ? '+' : '−'}${brl(Math.abs(k.faturamento - meta))}` : '—'}</td>
                <td className={clsx('px-3 py-2.5 text-right tabular-nums', corPct(k.pctMeta))}>{meta ? pct(k.pctMeta) : '—'}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Dias */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Faturamento por dia · {nomeVisao}</h2>
          </div>
          {pessoa !== 'geral' && podeEditarDe(pessoa) && <p className="text-xs text-gray-400">Toque no dia para lançar ou corrigir</p>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium">Data</th>
                <th className="text-left px-3 py-2.5 font-medium">Semana</th>
                {pessoa === 'geral' && vendedores.map((v) => <th key={v} className="text-right px-3 py-2.5 font-medium normal-case">{v}</th>)}
                <th className="text-right px-3 py-2.5 font-medium">Qtd. vendas</th>
                <th className="text-right px-3 py-2.5 font-medium">Total vendido</th>
                <th className="text-right px-4 py-2.5 font-medium">Ticket médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {linhasDia.map((l) => {
                const futuro = l.d > hoje
                const editavel = pessoa !== 'geral' && podeEditarDe(pessoa) && !futuro
                return (
                  <tr key={l.d} onClick={editavel ? () => abrirLancamento(l.d, pessoa) : undefined} className={clsx(futuro && 'opacity-40', editavel && 'cursor-pointer hover:bg-indigo-50/50', l.d === hoje && 'bg-indigo-50/40')}>
                    <td className="px-4 py-2 text-gray-800"><span className="font-medium tabular-nums">{dm(l.d)}</span> <span className="text-xs text-gray-400">{diaDaSemana(l.d)}</span></td>
                    <td className="px-3 py-2 text-xs text-gray-500">Sem. {semanaDo.get(l.d)}</td>
                    {pessoa === 'geral' && vendedores.map((v) => {
                      const r = l.porVendedor[v]
                      return <td key={v} className="px-3 py-2 text-right tabular-nums text-gray-600">{r ? (r.total_amount ? brl(r.total_amount) : <span className="text-gray-300">0</span>) : <span className="text-gray-200">—</span>}</td>
                    })}
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">{l.lancado ? num(l.qtd) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">{l.lancado ? brl(l.total) : <span className="text-gray-300 font-normal">{futuro ? '—' : 'sem lançamento'}</span>}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                      {l.qtd ? brl(l.total / l.qtd) : <span className="text-gray-300">—</span>}
                      {editavel && <Pencil className="inline w-3 h-3 ml-2 text-gray-300" />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                <td className="px-4 py-2.5 text-xs uppercase text-gray-600" colSpan={2}>Total do mês</td>
                {pessoa === 'geral' && vendedores.map((v) => <td key={v} className="px-3 py-2.5 text-right tabular-nums text-gray-700">{brl(vendasMes.filter((x) => x.salesperson_name === v).reduce((s, x) => s + x.total_amount, 0))}</td>)}
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{num(k.vendas)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">{brl(k.faturamento)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{k.vendas ? brl(k.ticketMedio) : '—'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Carteiras */}
      {pessoa === 'geral' && vendedores.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Metas por carteira — {MESES[sel.mes]}/{sel.ano}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {vendedores.map((nome) => {
              const iv = indicadores(vendasMes.filter((v) => v.salesperson_name === nome), metaDe(nome), dias, hoje)
              return (
                <button key={nome} onClick={() => setPessoa(nome)} className={clsx('text-left bg-white rounded-xl border p-4 hover:border-indigo-300 transition-all', nome === currentUserName ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-200')}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{nome}</p>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 tabular-nums">{brl(iv.faturamento)}</p>
                  {iv.meta > 0 ? (
                    <>
                      <p className="text-xs text-gray-500 mb-2">meta {brl(iv.meta)} · <span className={clsx('font-semibold', corPct(iv.pctMeta))}>{pct(iv.pctMeta)}</span></p>
                      <Barra p={iv.pctMeta} />
                    </>
                  ) : <p className="text-xs text-amber-700 mt-1">Sem meta cadastrada</p>}
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <dt className="text-gray-400">Falta</dt><dd className="text-right tabular-nums text-gray-700">{iv.meta ? brl(iv.falta) : '—'}</dd>
                    <dt className="text-gray-400">Buscar/dia</dt><dd className="text-right tabular-nums text-gray-700">{iv.encerrado ? '—' : iv.falta <= 0 ? 'ok' : brl(iv.buscarPorDia)}</dd>
                    <dt className="text-gray-400">Projeção</dt><dd className={clsx('text-right tabular-nums', iv.meta ? corPct(iv.pctProjecao) : 'text-gray-700')}>{brl(iv.projecao)}</dd>
                    <dt className="text-gray-400">Média/dia</dt><dd className="text-right tabular-nums text-gray-700">{brl(iv.mediaDia)}</dd>
                    <dt className="text-gray-400">Vendas</dt><dd className="text-right tabular-nums text-gray-700">{num(iv.vendas)}</dd>
                    <dt className="text-gray-400">Ticket médio</dt><dd className="text-right tabular-nums text-gray-700">{iv.vendas ? brl(iv.ticketMedio) : '—'}</dd>
                  </dl>
                </button>
              )
            })}
          </div>
        </section>
      )}

      </>)}

      {/* Modal: lançar vendas */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Vendas do dia</h2>
                <p className="text-xs text-gray-500 mt-0.5">Se o dia já tiver lançamento, ele é substituído</p>
              </div>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={salvarLancamento} className="space-y-4">
              <label className="block">
                <span className="block text-xs font-semibold text-gray-600 mb-1">Data</span>
                <input type="date" required value={form.data} max={hoje} onChange={(e) => {
                  const atual = sales.find((s) => s.salesperson_name === form.vendedor && s.sale_date === e.target.value)
                  setForm({ ...form, data: e.target.value, valor: atual ? num(atual.total_amount, 2) : '', qtd: atual ? String(atual.ticket_count) : '' })
                }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </label>
              {gestor ? (
                <label className="block">
                  <span className="block text-xs font-semibold text-gray-600 mb-1">Vendedor(a)</span>
                  <select value={form.vendedor} onChange={(e) => {
                    const atual = sales.find((s) => s.salesperson_name === e.target.value && s.sale_date === form.data)
                    setForm({ ...form, vendedor: e.target.value, valor: atual ? num(atual.total_amount, 2) : '', qtd: atual ? String(atual.ticket_count) : '' })
                  }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {todosVendedores.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
              ) : <p className="text-sm text-gray-600">Vendedor(a): <span className="font-semibold">{currentUserName}</span></p>}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-semibold text-gray-600 mb-1">Total vendido (R$)</span>
                  <input type="text" inputMode="decimal" required value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="5.250,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </label>
                <label className="block">
                  <span className="block text-xs font-semibold text-gray-600 mb-1">Qtd. de vendas</span>
                  <input type="number" inputMode="numeric" min={0} value={form.qtd} onChange={(e) => setForm({ ...form, qtd: e.target.value })} placeholder="0" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </label>
              </div>
              {(() => { const v = lerValor(form.valor), q = parseInt(form.qtd, 10); return v > 0 && q > 0 ? <p className="text-xs text-gray-500">Ticket médio do dia: <span className="font-semibold text-gray-700">{brl(v / q)}</span></p> : null })()}
              {erro && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setForm(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg">{salvando ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: metas */}
      {editMetas && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Metas de {MESES[sel.mes]}/{sel.ano}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{dias.length} dias úteis · a meta por dia e por semana é calculada sozinha</p>
              </div>
              <button onClick={() => setEditMetas(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={salvarMetas} className="space-y-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Meta por carteira</p>
              {Object.keys(editMetas.vend).map((nome) => (
                <label key={nome} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-gray-700 truncate">{nome}</span>
                  <input type="text" inputMode="decimal" value={editMetas.vend[nome]} onChange={(e) => setEditMetas({ ...editMetas, vend: { ...editMetas.vend, [nome]: e.target.value } })} placeholder="sem meta" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </label>
              ))}
              <div className="flex items-center gap-3">
                <input type="text" value={editMetas.novo} onChange={(e) => setEditMetas({ ...editMetas, novo: e.target.value })} placeholder="Nova carteira (nome)" className="w-28 flex-none px-2 py-2 border border-dashed border-gray-300 rounded-lg text-sm" />
                <button type="button" disabled={!editMetas.novo.trim() || editMetas.novo.trim() in editMetas.vend} onClick={() => setEditMetas({ ...editMetas, vend: { ...editMetas.vend, [editMetas.novo.trim()]: '' }, novo: '' })} className="text-sm text-indigo-700 font-medium disabled:opacity-40">+ adicionar</button>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <label className="block">
                  <span className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Meta do time</span>
                  <input type="text" inputMode="decimal" value={editMetas.time} onChange={(e) => setEditMetas({ ...editMetas, time: e.target.value })} placeholder={`soma das carteiras: ${brl(Object.values(editMetas.vend).reduce((s, v) => s + (lerValor(v) || 0), 0))}`} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <span className="text-xs text-gray-400">Deixe em branco para usar a soma das carteiras.</span>
                </label>
              </div>
              {erro && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditMetas(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg">{salvando ? 'Salvando…' : 'Salvar metas'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
