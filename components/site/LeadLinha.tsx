'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { STATUS, veioDoGoogle, type SiteLead, type StatusLead } from '@/lib/site/metricas'

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function LeadLinha({ lead }: { lead: SiteLead }) {
  const router = useRouter()
  const [status, setStatus] = useState<StatusLead>(lead.status)
  const [valor, setValor] = useState(lead.valor_venda ? String(lead.valor_venda).replace('.', ',') : '')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const mudou = status !== lead.status || (status === 'vendido' && valor !== (lead.valor_venda ? String(lead.valor_venda).replace('.', ',') : ''))
  const st = STATUS.find((s) => s.id === lead.status)

  async function salvar() {
    const v = status === 'vendido' ? Number(valor.replace(/\./g, '').replace(',', '.')) : null
    if (status === 'vendido' && (!v || v <= 0)) return setMsg('Informe o valor da venda.')
    setSalvando(true); setMsg('')
    const { error } = await createClient().from('site_leads').update({ status, valor_venda: v }).eq('id', lead.id)
    setSalvando(false)
    if (error) return setMsg('Não foi possível salvar: ' + error.message)
    setMsg('Salvo')
    router.refresh()
  }

  return (
    <li className="py-3 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-semibold tabular-nums text-gray-500">{dataHora(lead.created_at)}</span>
          <span className="font-semibold text-gray-900">{lead.nome}</span>
          <span className="text-sm text-gray-500">{lead.cidade}{lead.empresa ? ` · ${lead.empresa}` : ''}</span>
          {st && <span className={clsx('rounded-full px-2 text-xs font-semibold', st.cor)}>{st.rotulo}</span>}
          {veioDoGoogle(lead) && <span className="rounded-full bg-indigo-600 px-2 text-xs font-semibold text-white">Google Ads</span>}
        </p>
        <p className="text-sm text-gray-700">{[lead.produtos, lead.quantidade, lead.segmento, lead.prazo].filter(Boolean).join(' · ')}</p>
        {lead.detalhes && <p className="text-xs text-gray-500 line-clamp-2">{lead.detalhes}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select id={`status-${lead.id}`} aria-label="Situação do pedido" value={status} onChange={(e) => setStatus(e.target.value as StatusLead)}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {STATUS.map((s) => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
        </select>
        {status === 'vendido' && (
          <input id={`valor-${lead.id}`} aria-label="Valor da venda" inputMode="decimal" placeholder="Valor R$" value={valor} onChange={(e) => setValor(e.target.value)}
            className="w-28 rounded-lg border border-gray-200 px-2.5 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        )}
        <button type="button" onClick={salvar} disabled={!mudou || salvando}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        {msg && <span role="status" className={clsx('text-xs', msg === 'Salvo' ? 'text-emerald-600' : 'text-red-600')}>{msg}</span>}
      </div>
    </li>
  )
}
