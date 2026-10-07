'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import type { DFCData, Mes } from '@/lib/types'

const MESES: Mes[] = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const MESES_LABEL: Record<Mes, string> = {
  jan:'Jan',fev:'Fev',mar:'Mar',abr:'Abr',mai:'Mai',jun:'Jun',
  jul:'Jul',ago:'Ago',set:'Set',out:'Out',nov:'Nov',dez:'Dez'
}

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

interface Props {
  data: DFCData
}

function KPICard({ label, value, sub, color = 'indigo' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    green:  'bg-green-50  border-green-200  text-green-700',
    red:    'bg-red-50    border-red-200    text-red-700',
    amber:  'bg-amber-50  border-amber-200  text-amber-700',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color] ?? colors.indigo}`}>
      <p className="text-xs font-medium opacity-75 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function DFCDashboard({ data }: Props) {
  const realizados = data.realizados

  // Calcular totais Jan-Set
  const totalRV   = realizados.reduce((s, m) => s + (data.rv[m]?.real  ?? 0), 0)
  const totalMeta = realizados.reduce((s, m) => s + (data.rv[m]?.meta  ?? 0), 0)
  const totalRO   = realizados.reduce((s, m) => s + (data.ro[m]?.real  ?? 0), 0)
  const totalGC   = realizados.reduce((s, m) => s + (data.gc[m]?.real  ?? 0), 0)
  const lastMes   = realizados[realizados.length - 1]
  const saldoAtual = lastMes ? data.saldo_fin[lastMes] : 0

  // Dados para gráfico faturamento
  const chartRV = MESES.map(m => ({
    mes: MESES_LABEL[m],
    Meta: data.rv[m]?.meta ?? 0,
    Real: data.rv[m]?.real ?? null,
    Proj: data.rv[m]?.real === null ? (data.rv[m]?.meta ?? 0) : null,
  }))

  // Dados para gráfico GC + Saldo
  const chartGC = MESES.filter(m => realizados.includes(m)).map(m => ({
    mes: MESES_LABEL[m],
    GC:    data.gc[m]?.real ?? 0,
    Saldo: data.saldo_fin[m] ?? 0,
  }))

  // Dados para gráfico comparativo (RO, PV, PF)
  const chartOP = realizados.map(m => ({
    mes: MESES_LABEL[m],
    Receita:  data.rv[m]?.real ?? 0,
    PagVar:   -(data.pvar[m]?.real ?? 0),
    PagFix:   -(data.pfx[m]?.real ?? 0),
    RO:        data.ro[m]?.real ?? 0,
  }))

  const pctMeta = totalMeta > 0 ? (totalRV / totalMeta) * 100 : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">DFC — Demonstrativo de Fluxo de Caixa</h1>
        <p className="text-sm text-gray-500 mt-0.5">{data.period_label}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Faturamento Realizado"
          value={BRL(totalRV)}
          sub={`${pctMeta.toFixed(0)}% da meta`}
          color={pctMeta >= 100 ? 'green' : pctMeta >= 80 ? 'amber' : 'red'}
        />
        <KPICard
          label="Resultado Operacional"
          value={BRL(totalRO)}
          sub="Jan–Set acumulado"
          color={totalRO >= 0 ? 'green' : 'red'}
        />
        <KPICard
          label="Geração de Caixa"
          value={BRL(totalGC)}
          sub="Jan–Set acumulado"
          color={totalGC >= 0 ? 'green' : 'red'}
        />
        <KPICard
          label="Saldo Atual"
          value={BRL(saldoAtual)}
          sub={`Fim de ${lastMes ? MESES_LABEL[lastMes] : '—'}`}
          color={saldoAtual >= 10000 ? 'green' : saldoAtual >= 5000 ? 'amber' : 'red'}
        />
      </div>

      {/* Gráfico: Faturamento x Meta */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Faturamento vs Meta (R$)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartRV} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => BRL(v)} />
            <Legend />
            <Bar dataKey="Meta" fill="#e0e7ff" radius={[4,4,0,0]} />
            <Bar dataKey="Real" fill="#6366f1" radius={[4,4,0,0]} />
            <Bar dataKey="Proj" fill="#a5b4fc" radius={[4,4,0,0]} name="Projetado" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico: Geração de Caixa + Saldo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Geração de Caixa Mensal (R$)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartGC}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => BRL(v)} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="GC" fill="#10b981" radius={[4,4,0,0]} name="Geração de Caixa" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Evolução do Saldo Bancário (R$)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartGC}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => BRL(v)} />
              <Line type="monotone" dataKey="Saldo" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico: Composição Operacional */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Composição Operacional (R$)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartOP} barGap={1}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => BRL(Math.abs(v))} />
            <Legend />
            <Bar dataKey="Receita" fill="#6366f1" radius={[4,4,0,0]} name="Receita Bruta" />
            <Bar dataKey="PagVar" fill="#f59e0b" radius={[4,4,0,0]} name="Pagamentos Var." />
            <Bar dataKey="PagFix" fill="#ef4444" radius={[4,4,0,0]} name="Pagamentos Fix." />
            <Bar dataKey="RO" fill="#10b981" radius={[4,4,0,0]} name="Resultado Op." />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela Resumo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Tabela Resumo — Meses Realizados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="text-left px-4 py-3 font-medium">Linha</th>
                {realizados.map(m => (
                  <th key={m} className="text-right px-3 py-3 font-medium">{MESES_LABEL[m]}</th>
                ))}
                <th className="text-right px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { key: 'rv',   label: 'Receita Bruta' },
                { key: 'pvar', label: '(-) Pag. Variáveis' },
                { key: 'pfx',  label: '(-) Pag. Fixos' },
                { key: 'mc',   label: 'Margem de Contribuição' },
                { key: 'ro',   label: 'Resultado Operacional' },
                { key: 'gc',   label: 'Geração de Caixa' },
              ].map(({ key, label }) => {
                const row = data[key as keyof DFCData] as Record<Mes, { real: number | null }>
                const total = realizados.reduce((s, m) => s + (row[m]?.real ?? 0), 0)
                const isNeg = ['pvar','pfx'].includes(key)
                const isHighlight = ['mc','ro','gc'].includes(key)
                return (
                  <tr key={key} className={isHighlight ? 'bg-indigo-50/50 font-medium' : ''}>
                    <td className="px-4 py-2.5 text-gray-700">{label}</td>
                    {realizados.map(m => {
                      const val = row[m]?.real ?? 0
                      const display = isNeg ? -val : val
                      return (
                        <td key={m} className={`text-right px-3 py-2.5 tabular-nums ${display < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                          {BRL(display)}
                        </td>
                      )
                    })}
                    <td className={`text-right px-4 py-2.5 tabular-nums font-semibold ${(isNeg ? -total : total) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {BRL(isNeg ? -total : total)}
                    </td>
                  </tr>
                )
              })}
              {/* Saldo */}
              <tr className="bg-slate-50 font-semibold">
                <td className="px-4 py-2.5 text-gray-700">Saldo Final</td>
                {realizados.map(m => (
                  <td key={m} className="text-right px-3 py-2.5 tabular-nums text-indigo-700">
                    {BRL(data.saldo_fin[m] ?? 0)}
                  </td>
                ))}
                <td className="text-right px-4 py-2.5 tabular-nums text-indigo-700">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
