'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { clsx } from 'clsx'

export interface EmpresaLista {
  id: number
  rota: string
  nome: string
  endereco: string | null
  bairro: string | null
  telefone: string | null
  contato: string | null
  ultima: { data_visita: string; agendamento: string | null; obs: string | null; possibilidade: string | null; vendeu: boolean } | null
}

const norm = (s: unknown) => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
const dm = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7)
const campo = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function ListaEmpresas({ empresas, rotas, podeEditar }: { empresas: EmpresaLista[]; rotas: string[]; podeEditar: boolean }) {
  const [busca, setBusca] = useState('')
  const [rota, setRota] = useState('')
  const [situacao, setSituacao] = useState('')

  const lista = useMemo(() => {
    const q = norm(busca)
    return empresas.filter((e) =>
      (!rota || e.rota === rota) &&
      (!situacao || (situacao === 'nao' ? !e.ultima : situacao === 'sim' ? !!e.ultima : !!e.ultima?.agendamento)) &&
      (!q || norm(`${e.nome} ${e.bairro} ${e.endereco} ${e.contato}`).includes(q)))
  }, [empresas, busca, rota, situacao])

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-medium text-gray-700">Buscar<input id="busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, bairro, rua ou contato" className={campo} /></label>
        <label className="grid gap-1.5 text-sm font-medium text-gray-700">Rota
          <select id="filtro-rota" value={rota} onChange={(e) => setRota(e.target.value)} className={campo}>
            <option value="">Todas as rotas</option>
            {rotas.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-gray-700">Situação
          <select id="filtro-situacao" value={situacao} onChange={(e) => setSituacao(e.target.value)} className={campo}>
            <option value="">Todas</option>
            <option value="nao">Ainda não visitadas</option>
            <option value="sim">Já visitadas</option>
            <option value="ret">Com retorno agendado</option>
          </select>
        </label>
      </div>
      <p className="text-sm text-gray-500">{lista.length} empresa(s){podeEditar ? '. Toque numa empresa para abrir a ficha.' : ''}</p>
      <ul className="grid gap-2">
        {lista.slice(0, 300).map((e) => {
          const corpo = (
            <>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900">{e.nome}</span>
                {e.ultima?.vendeu && <span className="rounded-full bg-indigo-50 px-2 text-xs font-semibold text-indigo-700">já comprou</span>}
                {e.ultima?.possibilidade && (
                  <span className={clsx('rounded-full px-2 text-xs font-semibold', e.ultima.possibilidade === 'Alta' ? 'bg-emerald-50 text-emerald-700' : e.ultima.possibilidade === 'Média' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500')}>{e.ultima.possibilidade}</span>
                )}
              </span>
              <span className="block text-xs text-gray-500">{[e.rota, e.bairro, e.endereco, e.telefone].filter(Boolean).join(' · ')}</span>
              <span className="block text-xs text-gray-500">
                {e.ultima ? `Última visita ${dm(e.ultima.data_visita)}${e.ultima.agendamento ? ' · retorno ' + e.ultima.agendamento : ''}${e.ultima.obs ? ' · ' + e.ultima.obs : ''}` : 'Ainda não visitada'}
              </span>
            </>
          )
          return (
            <li key={e.id}>
              {podeEditar ? (
                <Link href={`/dashboard/externo/ficha/nova?empresa=${e.id}`} className="block rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-indigo-300">{corpo}</Link>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">{corpo}</div>
              )}
            </li>
          )
        })}
      </ul>
      {lista.length > 300 && <p className="text-sm text-gray-500">Mostrando as 300 primeiras. Use a busca para achar as demais.</p>}
    </div>
  )
}
