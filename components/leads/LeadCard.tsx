'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { MessageCircle, Check, FileText, Trophy, XCircle, CalendarClock, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  etapa, MOTIVOS, META_RESPOSTA_MIN, tempoResposta, fmtMin, quando, origemLead, linkWhats, type LeadCRM, type Etapa,
} from '@/lib/leads/crm'

const campo = 'rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40'
const num = (v: string) => Number(v.replace(/\./g, '').replace(',', '.'))
const brl = (v: number | null | undefined) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type Acao = null | 'orcamento' | 'venda' | 'perdido' | 'retorno'

export default function LeadCard({ lead, nomeResponsavel, podeEditar, destaque, hoje }: { lead: LeadCRM; nomeResponsavel?: string; podeEditar: boolean; destaque?: boolean; hoje: string }) {
  const router = useRouter()
  const [acao, setAcao] = useState<Acao>(null)
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [data, setData] = useState(lead.retorno_em ?? '')
  const [obs, setObs] = useState(lead.observacoes ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const e = etapa(lead.status)
  const origem = origemLead(lead)
  const wa = linkWhats(lead.telefone)
  const minutos = tempoResposta(lead)
  const aguardando = lead.status === 'novo'
  const atrasado = minutos > META_RESPOSTA_MIN
  const retornoVencido = lead.retorno_em && lead.retorno_em <= hoje && ['em_atendimento', 'orcado'].includes(lead.status)

  async function salvar(campos: Partial<LeadCRM> & { status?: Etapa }) {
    setSalvando(true); setErro('')
    const { error } = await createClient().from('site_leads').update(campos).eq('id', lead.id)
    setSalvando(false)
    if (error) return setErro('Não foi possível salvar: ' + error.message)
    setAcao(null); setValor(''); setMotivo('')
    router.refresh()
  }

  function confirmar() {
    if (acao === 'orcamento') return salvar({ status: 'orcado', valor_orcamento: valor ? num(valor) : null })
    if (acao === 'venda') {
      if (!(num(valor) > 0)) return setErro('Informe o valor da venda.')
      return salvar({ status: 'vendido', valor_venda: num(valor) })
    }
    if (acao === 'perdido') {
      if (!motivo) return setErro('Escolha o motivo.')
      return salvar({ status: 'perdido', motivo_perda: motivo })
    }
    if (acao === 'retorno') {
      if (!data) return setErro('Escolha a data do retorno.')
      return salvar({ retorno_em: data })
    }
  }

  return (
    <li id={`lead-${lead.id}`} className={clsx('rounded-xl border bg-white p-4 space-y-3', destaque ? 'border-indigo-400 ring-2 ring-indigo-100' : aguardando ? 'border-red-200' : 'border-gray-200')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-gray-900">{lead.nome}</span>
            <span className="text-sm text-gray-500">{lead.cidade}{lead.empresa ? ` · ${lead.empresa}` : ''}</span>
            <span className={clsx('rounded-full px-2 text-xs font-semibold', e.cor)}>{e.rotulo}</span>
            <span className={clsx('rounded-full px-2 text-xs font-semibold', origem.cor)}>{origem.rotulo}</span>
          </p>
          <p className="text-sm text-gray-700 mt-0.5">{[lead.produtos, lead.quantidade, lead.segmento, lead.prazo].filter(Boolean).join(' · ')}</p>
          {lead.detalhes && <p className="text-xs text-gray-500 mt-0.5">“{lead.detalhes}”</p>}
        </div>
        <div className="text-right text-xs tabular-nums shrink-0">
          <p className="text-gray-500">Chegou {quando(lead.created_at)}</p>
          {aguardando
            ? <p className={clsx('font-bold', atrasado ? 'text-red-600' : 'text-amber-600')}>Aguardando há {fmtMin(minutos)}</p>
            : lead.respondido_em && <p className={clsx('font-semibold', atrasado ? 'text-red-600' : 'text-emerald-600')}>Respondido em {fmtMin(minutos)}{nomeResponsavel ? ` · ${nomeResponsavel}` : ''}</p>}
          {lead.valor_orcamento ? <p className="text-gray-600">Orçado: {brl(lead.valor_orcamento)}</p> : null}
          {lead.status === 'vendido' && <p className="font-semibold text-emerald-700">Vendido: {brl(lead.valor_venda)}</p>}
          {lead.status === 'perdido' && lead.motivo_perda && <p className="text-gray-600">Motivo: {lead.motivo_perda}</p>}
          {lead.retorno_em && !['vendido', 'perdido'].includes(lead.status) && <p className={clsx(retornoVencido ? 'font-bold text-red-600' : 'text-indigo-700')}>Retornar em {lead.retorno_em.split('-').reverse().join('/')}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {wa
          ? <a href={wa} target="_blank" rel="noopener" className={clsx(btn, 'bg-green-600 text-white hover:bg-green-700')}><MessageCircle className="w-4 h-4" /> WhatsApp {lead.telefone}</a>
          : <span className="text-xs text-gray-500">Sem telefone no cadastro: o cliente chama no WhatsApp da LAESC ao enviar o orçamento.</span>}
        {podeEditar && lead.status === 'novo' && (
          <button type="button" disabled={salvando} onClick={() => salvar({ status: 'em_atendimento' })} className={clsx(btn, 'bg-indigo-600 text-white hover:bg-indigo-700')}><Check className="w-4 h-4" /> Já respondi</button>
        )}
        {podeEditar && lead.status === 'em_atendimento' && (
          <button type="button" onClick={() => setAcao('orcamento')} className={clsx(btn, 'border border-indigo-200 text-indigo-700 hover:bg-indigo-50')}><FileText className="w-4 h-4" /> Enviei orçamento</button>
        )}
        {podeEditar && ['em_atendimento', 'orcado'].includes(lead.status) && (<>
          <button type="button" onClick={() => setAcao('venda')} className={clsx(btn, 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50')}><Trophy className="w-4 h-4" /> Venda fechada</button>
          <button type="button" onClick={() => setAcao('perdido')} className={clsx(btn, 'border border-gray-200 text-gray-700 hover:bg-gray-50')}><XCircle className="w-4 h-4" /> Não fechou</button>
          <button type="button" onClick={() => setAcao('retorno')} className={clsx(btn, 'border border-gray-200 text-gray-700 hover:bg-gray-50')}><CalendarClock className="w-4 h-4" /> Agendar retorno</button>
        </>)}
        {podeEditar && ['vendido', 'perdido'].includes(lead.status) && (
          <button type="button" disabled={salvando} onClick={() => salvar({ status: 'em_atendimento' })} className={clsx(btn, 'border border-gray-200 text-gray-600 hover:bg-gray-50')}><RotateCcw className="w-4 h-4" /> Reabrir</button>
        )}
      </div>

      {acao && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-3">
          {(acao === 'orcamento' || acao === 'venda') && (
            <label className="grid gap-1 text-xs font-medium text-gray-600">{acao === 'venda' ? 'Valor da venda (R$) *' : 'Valor do orçamento (R$), se souber'}
              <input id={`valor-${lead.id}`} inputMode="decimal" value={valor} onChange={(ev) => setValor(ev.target.value)} placeholder="Ex.: 1.250,00" className={clsx(campo, 'w-40 tabular-nums')} autoFocus />
            </label>
          )}
          {acao === 'perdido' && (
            <label className="grid gap-1 text-xs font-medium text-gray-600">Por que não fechou? *
              <select id={`motivo-${lead.id}`} value={motivo} onChange={(ev) => setMotivo(ev.target.value)} className={campo}>
                <option value="">Escolha…</option>
                {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          )}
          {acao === 'retorno' && (
            <label className="grid gap-1 text-xs font-medium text-gray-600">Retornar ao cliente em
              <input id={`retorno-${lead.id}`} type="date" min={hoje} value={data} onChange={(ev) => setData(ev.target.value)} className={campo} />
            </label>
          )}
          <button type="button" disabled={salvando} onClick={confirmar} className={clsx(btn, 'bg-indigo-600 text-white hover:bg-indigo-700')}>{salvando ? 'Salvando…' : 'Confirmar'}</button>
          <button type="button" onClick={() => { setAcao(null); setErro('') }} className={clsx(btn, 'text-gray-600')}>Cancelar</button>
        </div>
      )}

      {podeEditar ? (
        <div className="flex flex-wrap items-start gap-2">
          <textarea id={`obs-${lead.id}`} rows={1} value={obs} onChange={(ev) => setObs(ev.target.value)} placeholder="Anotações do atendimento (o que o cliente pediu, próximo passo…)" className={clsx(campo, 'flex-1 min-w-[12rem] resize-y')} />
          {obs !== (lead.observacoes ?? '') && <button type="button" disabled={salvando} onClick={() => salvar({ observacoes: obs })} className={clsx(btn, 'border border-gray-200 text-gray-700')}>Salvar anotação</button>}
        </div>
      ) : lead.observacoes ? <p className="text-sm text-gray-600 border-t border-dashed border-gray-200 pt-2">Anotações: {lead.observacoes}</p> : null}

      {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
    </li>
  )
}
