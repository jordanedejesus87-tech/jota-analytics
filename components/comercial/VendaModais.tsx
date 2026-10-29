'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { X, AlertTriangle, Pencil, Trash2, Plus, Link2, CheckCircle2 } from 'lucide-react'
import { brl, num, dm, diaDaSemana, lerValor, type Venda } from '@/lib/comercial/metricas'
import { ORIGENS, infoOrigem, CANAL_ROTULO, type Origem, type VendaIndividual, type LeadAberto } from '@/lib/comercial/origens'

export interface FormVenda {
  id?: string
  data: string
  vendedor: string
  valor: string
  origem: Origem | ''
  cliente: string
  pedido: string
  obs: string
  leadId: string
}

const campo = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Fundo({ children, onClose, largo }: { children: React.ReactNode; onClose: () => void; largo?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={clsx('bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full p-5 sm:p-6 max-h-[92vh] overflow-y-auto', largo ? 'sm:max-w-lg' : 'sm:max-w-md')}>
        {children}
      </div>
    </div>
  )
}

// ── Registrar / editar uma venda ─────────────────────────────────────────────
export function ModalVenda({
  form, setForm, onClose, onSalvar, salvando, erro, ok, gestor, vendedores, hoje, leads, legado, currentUserName,
}: {
  form: FormVenda
  setForm: (f: FormVenda) => void
  onClose: () => void
  onSalvar: (continuar: boolean) => void
  salvando: boolean
  erro: string
  ok: string
  gestor: boolean
  vendedores: string[]
  hoje: string
  leads: LeadAberto[]
  legado: Venda | null
  currentUserName: string
}) {
  const v = lerValor(form.valor)
  const editando = !!form.id
  return (
    <Fundo onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{editando ? 'Editar venda' : 'Registrar venda'}</h2>
          <p className="text-xs text-gray-500 mt-0.5">Uma venda por vez — o total do dia é somado sozinho</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      {ok && <p className="mb-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {ok}</p>}

      <form onSubmit={(e) => { e.preventDefault(); onSalvar(false) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-semibold text-gray-600 mb-1">Data</span>
            <input type="date" required value={form.data} max={hoje} onChange={(e) => setForm({ ...form, data: e.target.value })} className={campo} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-gray-600 mb-1">Valor da venda (R$)</span>
            <input type="text" inputMode="decimal" required autoFocus value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="1.250,00" className={campo} />
          </label>
        </div>

        {gestor ? (
          <label className="block">
            <span className="block text-xs font-semibold text-gray-600 mb-1">Vendedor(a)</span>
            <select value={form.vendedor} onChange={(e) => setForm({ ...form, vendedor: e.target.value })} className={campo}>
              {vendedores.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
        ) : <p className="text-sm text-gray-600">Vendedor(a): <span className="font-semibold">{currentUserName}</span></p>}

        <div>
          <span className="block text-xs font-semibold text-gray-600 mb-1.5">De onde veio este cliente?</span>
          <div className="grid grid-cols-2 gap-2">
            {ORIGENS.map((o) => (
              <button type="button" key={o.id} onClick={() => setForm({ ...form, origem: o.id, leadId: o.id === 'site_google' ? form.leadId : '' })}
                className={clsx('text-left rounded-lg border px-3 py-2 text-sm font-semibold transition-all', form.origem === o.id ? `${o.cor} ring-2 ring-offset-1 ring-indigo-400` : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                {o.rotulo}
              </button>
            ))}
          </div>
          {form.origem && <p className="text-xs text-gray-500 mt-1.5">{infoOrigem(form.origem).ajuda}</p>}
        </div>

        {form.origem === 'site_google' && leads.length > 0 && (
          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1"><Link2 className="w-3.5 h-3.5" /> Veio de um orçamento do site? (opcional)</span>
            <select value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value, cliente: form.cliente || (leads.find((l) => l.id === e.target.value)?.empresa || leads.find((l) => l.id === e.target.value)?.nome || '') })} className={campo}>
              <option value="">Não / não sei</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{dm(l.created_at.slice(0, 10))} · {l.nome}{l.empresa ? ` (${l.empresa})` : ''}</option>)}
            </select>
            <span className="text-xs text-gray-400">Vincular mostra se a venda veio do Google Ads ou do Google orgânico e marca o orçamento como vendido.</span>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-semibold text-gray-600 mb-1">Cliente (opcional)</span>
            <input type="text" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Nome ou empresa" className={campo} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-gray-600 mb-1">Nº do pedido (opcional)</span>
            <input type="text" value={form.pedido} onChange={(e) => setForm({ ...form, pedido: e.target.value })} placeholder="ex.: 4521" className={campo} />
          </label>
        </div>
        <label className="block">
          <span className="block text-xs font-semibold text-gray-600 mb-1">Observação {form.origem === 'outro' ? '(diga qual foi a origem)' : '(opcional)'}</span>
          <input type="text" value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} className={campo} />
        </label>

        {legado && !editando && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            {dm(form.data)} já tem um lançamento pelo total do dia ({brl(legado.total_amount)} em {num(legado.ticket_count)} venda(s)). Ao registrar venda a venda, o total do dia passa a ser a soma das vendas registradas — lance <b>todas</b> as vendas desse dia.
          </p>
        )}
        {v > 0 && form.origem && <p className="text-xs text-gray-500">{brl(v)} · {infoOrigem(form.origem).rotulo}</p>}
        {erro && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}</p>}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button type="button" onClick={onClose} className="sm:flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">Fechar</button>
          {!editando && (
            <button type="button" disabled={salvando} onClick={() => onSalvar(true)} className="sm:flex-1 px-4 py-2.5 border border-indigo-200 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-50 disabled:opacity-60">Salvar e registrar outra</button>
          )}
          <button type="submit" disabled={salvando} className="sm:flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg">{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </Fundo>
  )
}

// ── Vendas de um dia ─────────────────────────────────────────────────────────
export function ModalDia({
  data, vendedor, vendas, totais, podeEditarDe, podeLancar, gestor, onClose, onNova, onEditar, onExcluir, onSemVendas, onCorrigirTotal, ocupado, erro,
}: {
  data: string
  vendedor: string | null
  vendas: VendaIndividual[]
  totais: Venda[]
  podeEditarDe: (nome: string) => boolean
  podeLancar: boolean
  gestor: boolean
  onClose: () => void
  onNova: () => void
  onEditar: (v: VendaIndividual) => void
  onExcluir: (v: VendaIndividual) => void
  onSemVendas: () => void
  onCorrigirTotal: () => void
  ocupado: boolean
  erro: string
}) {
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const total = vendas.reduce((s, v) => s + v.valor, 0)
  // Vendedores que só têm lançamento pelo total do dia (sem venda a venda)
  const comIndividual = new Set(vendas.map((v) => v.salesperson_name))
  const legados = totais.filter((t) => !comIndividual.has(t.salesperson_name))
  const podeAqui = vendedor ? podeEditarDe(vendedor) : podeLancar
  return (
    <Fundo onClose={onClose} largo>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{dm(data)} <span className="text-sm font-normal text-gray-400">{diaDaSemana(data)}</span></h2>
          <p className="text-xs text-gray-500 mt-0.5">{vendedor ?? 'Todo o time'} · {num(vendas.length)} venda(s) registrada(s) · {brl(total)}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      {vendas.length > 0 ? (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl mb-4">
          {vendas.map((v) => {
            const o = infoOrigem(v.origem)
            const pode = podeEditarDe(v.salesperson_name)
            return (
              <li key={v.id} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 tabular-nums">{brl(v.valor)}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {!vendedor && <span className="font-semibold text-gray-700">{v.salesperson_name} · </span>}
                      {v.cliente || 'Cliente não informado'}{v.pedido ? ` · pedido ${v.pedido}` : ''}
                    </p>
                    {v.observacao && <p className="text-xs text-gray-400 truncate">{v.observacao}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={clsx('text-[11px] font-semibold px-2 py-0.5 rounded-full border', o.cor)}>{o.rotulo}</span>
                    {v.canal_site && <span className="text-[10px] text-gray-500">{CANAL_ROTULO[v.canal_site] ?? v.canal_site}</span>}
                  </div>
                </div>
                {pode && (
                  <div className="flex gap-3 mt-1.5 text-xs">
                    <button onClick={() => onEditar(v)} className="flex items-center gap-1 text-indigo-700 font-medium"><Pencil className="w-3 h-3" /> Editar</button>
                    {confirmar === v.id ? (
                      <>
                        <button disabled={ocupado} onClick={() => { onExcluir(v); setConfirmar(null) }} className="flex items-center gap-1 text-red-700 font-semibold">Confirmar exclusão</button>
                        <button onClick={() => setConfirmar(null)} className="text-gray-500">Cancelar</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmar(v.id)} className="flex items-center gap-1 text-red-600 font-medium"><Trash2 className="w-3 h-3" /> Excluir</button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : legados.length === 0 && <p className="text-sm text-gray-500 mb-4">Nenhuma venda registrada neste dia.</p>}

      {legados.length > 0 && (
        <div className="mb-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-gray-600 mb-1">Lançado pelo total do dia (sem origem)</p>
          {legados.map((t) => (
            <p key={t.salesperson_name} className="text-sm text-gray-700 tabular-nums">
              {!vendedor && <span className="font-semibold">{t.salesperson_name}: </span>}
              {t.ticket_count || t.total_amount ? `${brl(t.total_amount)} em ${num(t.ticket_count)} venda(s)` : 'Dia marcado sem vendas'}
            </p>
          ))}
        </div>
      )}

      {erro && <p className="mb-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}</p>}

      {podeAqui && (
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={onNova} className="sm:flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg"><Plus className="w-4 h-4" /> Registrar venda neste dia</button>
          {vendedor && vendas.length === 0 && !legados.some((t) => t.ticket_count > 0) && !legados.some((t) => t.ticket_count === 0 && t.total_amount === 0) && (
            <button disabled={ocupado} onClick={onSemVendas} className="sm:flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">Não teve venda neste dia</button>
          )}
        </div>
      )}
      {gestor && vendedor && vendas.length === 0 && (
        <button onClick={onCorrigirTotal} className="mt-3 text-xs text-gray-500 underline">Corrigir o total do dia (lançamento antigo, sem origem)</button>
      )}
    </Fundo>
  )
}
