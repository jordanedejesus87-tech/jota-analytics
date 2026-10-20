import Link from 'next/link'
import { clsx } from 'clsx'
import FiltroPeriodo from '@/components/externo/FiltroPeriodo'
import { brl, num, type Periodo, type VisitaExt } from '@/lib/externo/metricas'

export default function VisitasView({ visitas, periodo, gestor, salvo, apagado }: { visitas: VisitaExt[]; periodo: Periodo; gestor: boolean; salvo?: boolean; apagado?: boolean }) {
  // Agrupa por dia, do mais recente para o mais antigo
  const dias = new Map<string, VisitaExt[]>()
  for (const v of visitas) {
    if (!dias.has(v.data_visita)) dias.set(v.data_visita, [])
    dias.get(v.data_visita)!.push(v)
  }
  const fmtDia = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' })

  return (
    <div className="space-y-4">
      {salvo && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Visita salva.</p>}
      {apagado && <p role="status" className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">Visita apagada.</p>}
      <FiltroPeriodo de={periodo.de} ate={periodo.ate} atalho={periodo.atalho} rotulo={`${periodo.rotulo} · ${visitas.length} visita(s)`} />
      {visitas.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">Nenhuma visita nesse período.</p>}
      {Array.from(dias.entries()).map(([dia, lista]) => (
        <section key={dia} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{fmtDia(dia)} · {lista.length} visita(s)</h3>
          <ul className="grid gap-2">
            {lista.map((v) => (
              <li key={v.id}>
                <Link href={`/dashboard/externo/ficha/${v.id}`} className="block rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-indigo-300 active:bg-gray-50">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">{v.cliente}</span>
                    <span className={clsx('rounded-full px-2 text-xs font-semibold', v.tipo === 'followup' ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-600')}>{v.tipo === 'followup' ? 'Follow-up' : '1ª visita'}</span>
                    {Number(v.faturamento) > 0 && <span className="rounded-full bg-indigo-50 px-2 text-xs font-semibold text-indigo-700">{brl(v.faturamento)}</span>}
                    {v.possibilidade && <span className={clsx('rounded-full px-2 text-xs font-semibold', v.possibilidade === 'Alta' ? 'bg-emerald-50 text-emerald-700' : v.possibilidade === 'Média' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500')}>{v.possibilidade}</span>}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {v.hora_chegada ? v.hora_chegada.slice(0, 5) : 'sem hora'}{v.duracao_min ? ` (${v.duracao_min} min)` : ''} · {v.rota}{gestor ? ' · ' + v.vendedor : ''}{v.expectativa_pecas ? ` · ${num(v.expectativa_pecas)} peças esperadas` : ''}
                  </span>
                  {v.obs && <span className="block text-xs text-gray-500">{v.obs}{v.agendamento ? ' · retorno ' + v.agendamento : ''}</span>}
                  {v.proximo_passo && <span className="block text-xs text-gray-700"><span className="font-medium">Próximo passo:</span> {v.proximo_passo}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
