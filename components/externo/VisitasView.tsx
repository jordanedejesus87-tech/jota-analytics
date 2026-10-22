import Link from 'next/link'
import { clsx } from 'clsx'
import FiltroPeriodo from '@/components/externo/FiltroPeriodo'
import { brl, num, dm, classificar, type Periodo, type VisitaExt } from '@/lib/externo/metricas'

// Visitas como atividades do dia: cada visita (1ª, follow-up, 2ª, 3ª…) é uma linha própria, em ordem de horário.

interface Props {
  visitas: VisitaExt[]
  ordem: Record<number, number>
  periodo: Periodo
  gestor: boolean
  filtro?: string
  salvo?: boolean
  apagado?: boolean
}

const fmtDia = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' })

function rotuloTipo(v: VisitaExt, n?: number) {
  if (!n || n <= 1) return v.tipo === 'followup' ? 'Follow-up' : '1ª visita'
  return `Follow-up · ${n}ª visita`
}

function Contagem({ lista, ordem }: { lista: VisitaExt[]; ordem: Record<number, number> }) {
  const fu = lista.filter((v) => (ordem[v.id] ?? 1) > 1 || v.tipo === 'followup').length
  const fat = lista.reduce((s, v) => s + Number(v.faturamento || 0), 0)
  const vendas = lista.filter((v) => classificar(v).vendeu).length
  const dur = lista.filter((v) => v.duracao_min).reduce((s, v) => s + (v.duracao_min || 0), 0)
  return (
    <span className="text-xs font-normal normal-case tracking-normal text-gray-500">
      {lista.length} atividade(s) · {lista.length - fu} 1ª visita(s) · {fu} follow-up(s)
      {vendas ? ` · ${vendas} venda(s) ${brl(fat)}` : ''}{dur ? ` · ${Math.floor(dur / 60)}h${String(dur % 60).padStart(2, '0')} em visitas` : ''}
    </span>
  )
}

export default function VisitasView({ visitas, ordem, periodo, gestor, filtro, salvo, apagado }: Props) {
  const ehFollowup = (v: VisitaExt) => (ordem[v.id] ?? 1) > 1 || v.tipo === 'followup'
  const lista = filtro === 'followup' ? visitas.filter(ehFollowup) : filtro === 'primeira' ? visitas.filter((v) => !ehFollowup(v)) : visitas
  const dias = new Map<string, VisitaExt[]>()
  for (const v of lista) {
    if (!dias.has(v.data_visita)) dias.set(v.data_visita, [])
    dias.get(v.data_visita)!.push(v)
  }
  const totalFu = visitas.filter(ehFollowup).length
  const q = (tipo?: string) => {
    const p = new URLSearchParams({ de: periodo.de, ate: periodo.ate })
    if (tipo) p.set('tipo', tipo)
    return '?' + p.toString()
  }

  return (
    <div className="space-y-4">
      {salvo && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Visita salva.</p>}
      {apagado && <p role="status" className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">Visita apagada.</p>}
      <FiltroPeriodo de={periodo.de} ate={periodo.ate} atalho={periodo.atalho} rotulo={`${periodo.rotulo} · ${visitas.length} atividade(s): ${visitas.length - totalFu} 1ª visita(s) e ${totalFu} follow-up(s)`} />

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
        {[[undefined, `Todas · ${visitas.length}`], ['primeira', `1ª visitas · ${visitas.length - totalFu}`], ['followup', `Follow-ups · ${totalFu}`]].map(([t, r]) => (
          <Link key={r} href={q(t)} className={clsx('shrink-0 rounded-full border px-3 py-1.5 text-sm', (filtro || undefined) === t ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-200 bg-white text-gray-700')}>{r}</Link>
        ))}
      </div>

      {lista.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">Nenhuma atividade nesse período.</p>}

      {Array.from(dias.entries()).map(([dia, doDia]) => (
        <section key={dia} className="space-y-2">
          <h3 className="flex flex-wrap items-baseline gap-x-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
            <span>{fmtDia(dia)}</span>
            <Contagem lista={doDia} ordem={ordem} />
          </h3>
          <ol className="relative space-y-2 border-l-2 border-gray-200 pl-4 ml-1">
            {doDia.map((v) => {
              const fu = ehFollowup(v)
              const vendeu = classificar(v).vendeu
              return (
                <li key={v.id} className="relative">
                  <span className={clsx('absolute -left-[23px] top-4 h-3 w-3 rounded-full ring-2 ring-white', vendeu ? 'bg-indigo-600' : fu ? 'bg-sky-500' : 'bg-gray-400')} />
                  <Link href={`/dashboard/externo/ficha/${v.id}`} className="block rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-indigo-300 active:bg-gray-50">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold tabular-nums text-gray-500">
                        {v.hora_chegada ? v.hora_chegada.slice(0, 5) : '--:--'}{v.hora_saida ? `–${v.hora_saida.slice(0, 5)}` : ''}
                      </span>
                      <span className="font-semibold text-gray-900">{v.cliente}</span>
                      <span className={clsx('rounded-full px-2 text-xs font-semibold', fu ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-600')}>{rotuloTipo(v, ordem[v.id])}</span>
                      {vendeu && <span className="rounded-full bg-indigo-600 px-2 text-xs font-semibold text-white">vendeu {brl(v.faturamento)}</span>}
                      {!vendeu && v.possibilidade && <span className={clsx('rounded-full px-2 text-xs font-semibold', v.possibilidade === 'Alta' ? 'bg-emerald-50 text-emerald-700' : v.possibilidade === 'Média' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500')}>chance {v.possibilidade.toLowerCase()}</span>}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {[v.rota, v.bairro, v.duracao_min ? `${v.duracao_min} min` : null, gestor ? v.vendedor : null, v.expectativa_pecas ? `${num(v.expectativa_pecas)} peças esperadas` : null].filter(Boolean).join(' · ')}
                    </span>
                    {v.objetivo && <span className="block text-sm text-gray-700 mt-1"><span className="font-medium">Objetivo:</span> {v.objetivo}</span>}
                    {v.obs && <span className="block text-sm text-gray-700"><span className="font-medium">{fu ? 'Combinado:' : 'Obs:'}</span> {v.obs}</span>}
                    {v.proximo_passo && <span className="block text-sm text-gray-700"><span className="font-medium">Próximo passo:</span> {v.proximo_passo}</span>}
                    {(v.retorno_data || v.agendamento) && <span className="block text-xs text-indigo-700 mt-0.5">Retorno: {v.retorno_data ? dm(v.retorno_data) : v.agendamento}</span>}
                  </Link>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
