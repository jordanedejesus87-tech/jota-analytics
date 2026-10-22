'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { X, ChevronRight } from 'lucide-react'

export interface LinhaDetalhe {
  id: number
  data: string
  hora: string | null
  cliente: string
  rota: string
  etiqueta?: string
  cor?: 'sky' | 'gray' | 'indigo' | 'red' | 'emerald' | 'amber'
  texto?: string | null
  valor?: string | null
}

const CORES = {
  sky: 'bg-sky-50 text-sky-700',
  gray: 'bg-gray-100 text-gray-600',
  indigo: 'bg-indigo-600 text-white',
  red: 'bg-red-50 text-red-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
}
const dmh = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

interface Props {
  titulo: string
  valor: string
  linha?: React.ReactNode
  linha2?: React.ReactNode
  alerta?: boolean
  ok?: boolean
  itens: LinhaDetalhe[]
  subtitulo?: string
}

/** Card de indicador clicável: abre uma janela com a lista do que compõe o número. */
export default function TileDetalhe({ titulo, valor, linha, linha2, alerta, ok, itens, subtitulo }: Props) {
  const [aberto, setAberto] = useState(false)
  useEffect(() => {
    if (!aberto) return
    const fechar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    window.addEventListener('keydown', fechar)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', fechar); document.body.style.overflow = '' }
  }, [aberto])

  return (
    <>
      <button type="button" onClick={() => setAberto(true)}
        className={clsx('group text-left rounded-xl border bg-white p-3 sm:p-4 min-w-0 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 active:bg-indigo-50', alerta ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200')}>
        <span className="flex items-start justify-between gap-2">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{titulo}</span>
          <ChevronRight className="w-4 h-4 shrink-0 text-gray-300 group-hover:text-indigo-500" />
        </span>
        <span className={clsx('block text-xl sm:text-2xl font-bold leading-tight tabular-nums', alerta ? 'text-red-700' : ok === true ? 'text-emerald-700' : 'text-gray-900')}>{valor}</span>
        {linha && <span className="block text-xs text-gray-500 mt-1">{linha}</span>}
        {linha2 && <span className={clsx('block text-xs mt-0.5', ok === undefined ? 'text-gray-400' : ok ? 'text-emerald-600' : 'text-red-600')}>{linha2}</span>}
        <span className="block text-[11px] font-semibold text-indigo-600 mt-1.5">Ver lista ({itens.length})</span>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={() => setAberto(false)} role="dialog" aria-modal="true" aria-label={titulo}>
          <div className="w-full sm:max-w-2xl max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{titulo} · {valor}</h2>
                <p className="text-xs text-gray-500">{subtitulo ?? `${itens.length} registro(s)`}</p>
              </div>
              <button onClick={() => setAberto(false)} aria-label="Fechar" className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto">
              {itens.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-500">Nada para mostrar neste período.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {itens.map((i, k) => (
                    <li key={`${i.id}-${k}`}>
                      <Link href={`/dashboard/externo/ficha/${i.id}`} className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-gray-50 active:bg-gray-100">
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-xs font-semibold tabular-nums text-gray-500">{dmh(i.data)}{i.hora ? ` ${i.hora.slice(0, 5)}` : ''}</span>
                            <span className="font-semibold text-gray-900">{i.cliente}</span>
                            {i.etiqueta && <span className={clsx('rounded-full px-2 text-xs font-semibold', CORES[i.cor ?? 'gray'])}>{i.etiqueta}</span>}
                          </span>
                          <span className="block text-xs text-gray-500">{i.rota}</span>
                          {i.texto && <span className="block text-sm text-gray-700 mt-0.5 line-clamp-2">{i.texto}</span>}
                        </span>
                        {i.valor && <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{i.valor}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
