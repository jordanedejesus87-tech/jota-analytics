'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { criarRota, renomearRota, excluirRota, type EstadoRota } from '@/app/dashboard/externo/rotas/acoes'

const campo = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const inicial: EstadoRota = { n: 0 }

function Botao({ children, cor = 'indigo' }: { children: React.ReactNode; cor?: 'indigo' | 'red' }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${cor === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
      {pending ? 'Salvando…' : children}
    </button>
  )
}

function Aviso({ estado }: { estado: EstadoRota }) {
  if (estado.erro) return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{estado.erro}</p>
  if (estado.ok) return <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{estado.ok}</p>
  return null
}

interface Rota { nome: string; empresas: number }

function LinhaRota({ rota, outras, podeEditar }: { rota: Rota; outras: string[]; podeEditar: boolean }) {
  const [modo, setModo] = useState<'ver' | 'renomear' | 'excluir'>('ver')
  const [eRen, aRen] = useFormState(renomearRota, inicial)
  const [eExc, aExc] = useFormState(excluirRota, inicial)
  useEffect(() => { if (eRen.ok || (eRen.n && !eRen.erro)) setModo('ver') }, [eRen])
  return (
    <li className="py-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/dashboard/externo/empresas?rota=${encodeURIComponent(rota.nome)}`} className="min-w-0">
          <span className="block font-semibold text-gray-900 truncate">{rota.nome}</span>
          <span className="block text-xs text-gray-500">{rota.empresas} empresa(s)</span>
        </Link>
        {podeEditar && modo === 'ver' && (
          <span className="flex shrink-0 gap-1">
            <button onClick={() => setModo('renomear')} aria-label={`Renomear ${rota.nome}`} className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Pencil className="w-4 h-4" /><span className="hidden sm:inline">Renomear</span></button>
            <button onClick={() => setModo('excluir')} aria-label={`Excluir ${rota.nome}`} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /><span className="hidden sm:inline">Excluir</span></button>
          </span>
        )}
      </div>
      {modo === 'renomear' && (
        <form action={aRen} className="flex flex-wrap gap-2">
          <input type="hidden" name="antigo" value={rota.nome} />
          <input name="nome" defaultValue={rota.nome} autoFocus className={`${campo} flex-1 min-w-[12rem]`} />
          <Botao>Salvar</Botao>
          <button type="button" onClick={() => setModo('ver')} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600">Cancelar</button>
          {rota.empresas > 0 && <p className="w-full text-xs text-gray-500">As {rota.empresas} empresa(s) desta rota passam a usar o nome novo.</p>}
        </form>
      )}
      {modo === 'excluir' && (
        <form action={aExc} className="rounded-lg border border-red-200 bg-red-50/60 p-3 space-y-2">
          <input type="hidden" name="nome" value={rota.nome} />
          {rota.empresas > 0 ? (
            <label className="grid gap-1.5 text-sm text-gray-800">
              As {rota.empresas} empresa(s) desta rota vão para:
              <select name="destino" defaultValue="" className={campo}>
                <option value="">Sem rota</option>
                {outras.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          ) : <p className="text-sm text-gray-800">Esta rota não tem empresas.</p>}
          <p className="text-xs text-gray-600">As empresas e o histórico de visitas não são apagados.</p>
          <div className="flex gap-2">
            <Botao cor="red">Excluir rota</Botao>
            <button type="button" onClick={() => setModo('ver')} className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600">Cancelar</button>
          </div>
        </form>
      )}
      <Aviso estado={eRen} />
      <Aviso estado={eExc} />
    </li>
  )
}

export default function GerenciarRotas({ rotas, semRota, podeEditar }: { rotas: Rota[]; semRota: number; podeEditar: boolean }) {
  const [eCri, aCri] = useFormState(criarRota, inicial)
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => { if (eCri.ok) form.current?.reset() }, [eCri])
  return (
    <div className="space-y-4">
      {podeEditar && (
        <form ref={form} action={aCri} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
          <label htmlFor="nova-rota" className="text-sm font-semibold text-gray-900">Nova rota</label>
          <div className="flex gap-2">
            <input id="nova-rota" name="nome" placeholder="Ex.: Rota 5, São Sepé, Distrito industrial" className={campo} />
            <Botao><span className="flex items-center gap-1"><Plus className="w-4 h-4" />Criar</span></Botao>
          </div>
          <Aviso estado={eCri} />
        </form>
      )}
      <section className="rounded-xl border border-gray-200 bg-white px-4">
        {rotas.length === 0 ? (
          <p className="py-6 text-sm text-gray-500">Nenhuma rota cadastrada ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rotas.map((r) => <LinhaRota key={r.nome} rota={r} outras={rotas.map((x) => x.nome).filter((x) => x !== r.nome)} podeEditar={podeEditar} />)}
          </ul>
        )}
        {semRota > 0 && <p className="border-t border-gray-100 py-3 text-xs text-gray-500">{semRota} empresa(s) estão sem rota. Para colocar numa rota, abra a empresa em uma nova visita e escolha a rota.</p>}
      </section>
    </div>
  )
}
