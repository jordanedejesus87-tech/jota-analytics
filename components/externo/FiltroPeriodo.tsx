'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { CalendarRange } from 'lucide-react'
import { ATALHOS } from '@/lib/externo/metricas'

const campo = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function FiltroPeriodo({ de, ate, atalho, rotulo }: { de: string; ate: string; atalho: string; rotulo: string }) {
  const router = useRouter()
  const path = usePathname()
  const params = useSearchParams()
  const [aberto, setAberto] = useState(atalho === 'custom')
  const [ini, setIni] = useState(de)
  const [fim, setFim] = useState(ate)
  const [erro, setErro] = useState('')

  function ir(novos: Record<string, string | null>) {
    const q = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(novos)) (v === null ? q.delete(k) : q.set(k, v))
    router.push(`${path}?${q.toString()}`)
  }

  function aplicar(e: React.FormEvent) {
    e.preventDefault()
    if (!ini || !fim) return setErro('Escolha a data inicial e a final.')
    if (ini > fim) return setErro('A data inicial precisa ser antes da final.')
    setErro('')
    ir({ de: ini, ate: fim, p: null })
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" role="group" aria-label="Período">
        {ATALHOS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => { setAberto(false); ir({ p: a.id, de: null, ate: null }) }}
            aria-pressed={atalho === a.id}
            className={clsx('shrink-0 rounded-full border px-3 py-1.5 text-sm', atalho === a.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700')}
          >
            {a.rotulo}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAberto((x) => !x)}
          aria-expanded={aberto}
          className={clsx('shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm', atalho === 'custom' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700')}
        >
          <CalendarRange className="w-4 h-4" /> Escolher datas
        </button>
      </div>
      {aberto && (
        <form onSubmit={aplicar} className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:flex sm:items-end sm:gap-3">
          <label className="grid gap-1 text-xs font-medium text-gray-600">De<input id="periodo-de" type="date" value={ini} onChange={(e) => setIni(e.target.value)} className={campo} /></label>
          <label className="grid gap-1 text-xs font-medium text-gray-600">Até<input id="periodo-ate" type="date" value={fim} onChange={(e) => setFim(e.target.value)} className={campo} /></label>
          <button type="submit" className="col-span-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Ver período</button>
          {erro && <p role="alert" className="col-span-2 text-sm text-red-600">{erro}</p>}
        </form>
      )}
      <p className="text-sm text-gray-500">{rotulo}</p>
    </div>
  )
}
