'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

export interface EmpresaEscolha { id: number; nome: string; rota: string; bairro: string | null; ultima: string | null; retorno: string | null }

const sem = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

export default function EscolherEmpresa({ empresas, hoje }: { empresas: EmpresaEscolha[]; hoje: string }) {
  const [busca, setBusca] = useState('')
  const lista = useMemo(() => {
    const q = sem(busca.trim())
    const filtradas = empresas.filter((e) => !q || sem(`${e.nome} ${e.rota} ${e.bairro ?? ''}`).includes(q))
    // Primeiro quem tem retorno marcado (mais urgente primeiro), depois as visitadas mais recentemente.
    return filtradas.sort((a, b) => (a.retorno ? 0 : 1) - (b.retorno ? 0 : 1) || (a.retorno ?? '').localeCompare(b.retorno ?? '') || (b.ultima ?? '').localeCompare(a.ultima ?? '')).slice(0, 60)
  }, [empresas, busca])
  return (
    <div className="space-y-3">
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus placeholder="Buscar empresa, rota ou bairro" className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </label>
      {lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">Nenhuma empresa já visitada com esse nome. Se é a primeira vez, use <b>Primeira visita</b>.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {lista.map((e) => (
            <li key={e.id}>
              <Link href={`/dashboard/externo/ficha/nova?tipo=followup&empresa=${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
                <span className="min-w-0">
                  <span className="block font-medium text-gray-900 truncate">{e.nome}</span>
                  <span className="block text-xs text-gray-500 truncate">{[e.rota, e.bairro, e.ultima && `última visita ${dm(e.ultima)}`].filter(Boolean).join(' · ')}</span>
                </span>
                {e.retorno && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${e.retorno < hoje ? 'bg-red-50 text-red-700' : e.retorno === hoje ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                    {e.retorno < hoje ? `atrasado ${dm(e.retorno)}` : e.retorno === hoje ? 'hoje' : `retorno ${dm(e.retorno)}`}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
