'use client'

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DiaMarketing } from '@/lib/marketing/metricas'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`

export default function GraficoMarketing({ serie, plataformas }: { serie: DiaMarketing[]; plataformas: ('meta' | 'google' | 'tiktok')[] }) {
  const cores = { meta: '#7c3aed', google: '#0ea5e9', tiktok: '#1e293b' }
  const nomes = { meta: 'Meta', google: 'Google', tiktok: 'TikTok' }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={serie} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="data" tickFormatter={dm} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis yAxisId="r" tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={56} />
          <YAxis yAxisId="c" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: '#059669' }} tickLine={false} axisLine={false} width={28} />
          <Tooltip
            labelFormatter={(l) => dm(String(l))}
            formatter={(v: number, n: string) => (n === 'Contatos' ? [v.toLocaleString('pt-BR'), n] : [brl(v), n])}
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
          {plataformas.map((p, i) => (
            <Bar key={p} yAxisId="r" dataKey={p} name={nomes[p]} stackId="inv" fill={cores[p]} radius={i === plataformas.length - 1 ? [3, 3, 0, 0] : 0} maxBarSize={22} />
          ))}
          <Line yAxisId="c" type="monotone" dataKey="contatos" name="Contatos" stroke="#059669" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
