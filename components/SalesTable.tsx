'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SaleRecord, SaleRecordInsert, Canal } from '@/lib/types'
import { Plus, Trash2, X } from 'lucide-react'

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const CANAIS: Canal[] = ['loja','digital','b2b','outros']
const CANAL_LABEL: Record<Canal, string> = { loja:'Loja', digital:'Digital', b2b:'B2B', outros:'Outros' }

interface Props {
  initialRecords: SaleRecord[]
  companyId: string
}

const EMPTY_FORM: Omit<SaleRecordInsert, 'company_id'> = {
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  customer: '',
  salesperson: '',
  channel: 'loja',
  category: '',
  notes: '',
}

export default function SalesTable({ initialRecords, companyId }: Props) {
  const supabase = createClient()
  const [records, setRecords] = useState<SaleRecord[]>(initialRecords)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload: SaleRecordInsert = { ...form, company_id: companyId }
    const { data, error: err } = await supabase
      .from('sales_records')
      .insert(payload)
      .select()
      .single()

    if (err) {
      setError('Erro ao salvar. Tente novamente.')
    } else {
      setRecords(prev => [data, ...prev])
      setForm({ ...EMPTY_FORM })
      setShowForm(false)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este registro?')) return
    await supabase.from('sales_records').delete().eq('id', id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const totalMes = records
    .filter(r => r.date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, r) => s + r.amount, 0)

  const total = records.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Acompanhamento Comercial</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registre e acompanhe as vendas da equipe</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Venda
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Registros</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{records.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Faturamento Total</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{BRL(total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Mês Atual</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{BRL(totalMes)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Ticket Médio</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {records.length > 0 ? BRL(total / records.length) : '—'}
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Vendedor</th>
                <th className="text-left px-4 py-3 font-medium">Canal</th>
                <th className="text-right px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    Nenhuma venda registrada ainda.
                  </td>
                </tr>
              )}
              {records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{r.customer || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.salesperson || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                      {CANAL_LABEL[r.channel as Canal]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                    {BRL(r.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nova Venda */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Registrar Venda</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={form.amount || ''}
                    onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
                <input
                  type="text"
                  value={form.customer}
                  onChange={e => setForm({ ...form, customer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vendedor</label>
                  <input
                    type="text"
                    value={form.salesperson}
                    onChange={e => setForm({ ...form, salesperson: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Vendedor"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Canal</label>
                  <select
                    value={form.channel}
                    onChange={e => setForm({ ...form, channel: e.target.value as Canal })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CANAIS.map(c => (
                      <option key={c} value={c}>{CANAL_LABEL[c]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Opcional..."
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
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
