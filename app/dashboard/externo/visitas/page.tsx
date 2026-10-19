import Link from 'next/link'
import { clsx } from 'clsx'
import { sessaoExterno } from '@/lib/externo/sessao'
import { hojeSP, segundaDe, somarDias, dm, rotuloSemana, brl, num, type VisitaExt } from '@/lib/externo/metricas'

export const dynamic = 'force-dynamic'

export default async function Visitas({ searchParams }: { searchParams: { s?: string; salvo?: string; apagado?: string } }) {
  const { supabase, profile, gestor } = await sessaoExterno()
  const atual = segundaDe(hojeSP())
  const ini = searchParams.s || atual
  const fim = somarDias(ini, 6)
  const { data } = await supabase
    .from('vw_ext_visitas').select('*')
    .eq('company_id', profile.company_id)
    .gte('data_visita', ini).lte('data_visita', fim)
    .order('data_visita', { ascending: false }).order('hora_chegada', { ascending: false })
  const visitas = (data ?? []) as VisitaExt[]
  const semanas = Array.from({ length: 8 }, (_, i) => somarDias(atual, -7 * i))

  return (
    <div className="space-y-4">
      {searchParams.salvo && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Ficha salva.</p>}
      {searchParams.apagado && <p role="status" className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">Ficha apagada.</p>}
      <div className="flex flex-wrap gap-2" aria-label="Semana">
        {semanas.map((k) => (
          <Link key={k} href={`?s=${k}`} aria-current={k === ini ? 'true' : undefined} className={clsx('rounded-full border px-3 py-1 text-sm', k === ini ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700')}>
            {k === atual ? 'Esta semana' : rotuloSemana(k)}
          </Link>
        ))}
      </div>
      <p className="text-sm text-gray-500">{visitas.length} visita(s) de {dm(ini)} a {dm(fim)}. Toque numa visita para abrir a ficha.</p>
      <ul className="grid gap-2">
        {visitas.map((v) => (
          <li key={v.id}>
            <Link href={`/dashboard/externo/ficha/${v.id}`} className="block rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-indigo-300">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900">{v.cliente}</span>
                {Number(v.faturamento) > 0 && <span className="rounded-full bg-indigo-50 px-2 text-xs font-semibold text-indigo-700">{brl(v.faturamento)}</span>}
                {v.possibilidade && <span className={clsx('rounded-full px-2 text-xs font-semibold', v.possibilidade === 'Alta' ? 'bg-emerald-50 text-emerald-700' : v.possibilidade === 'Média' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500')}>{v.possibilidade}</span>}
              </span>
              <span className="block text-xs text-gray-500">
                {dm(v.data_visita)}{v.hora_chegada ? ' · ' + v.hora_chegada.slice(0, 5) : ''}{v.duracao_min ? ` (${v.duracao_min} min)` : ''} · {v.rota}{gestor ? ' · ' + v.vendedor : ''}{v.expectativa_pecas ? ` · ${num(v.expectativa_pecas)} peças esperadas` : ''}
              </span>
              {v.obs && <span className="block text-xs text-gray-500">{v.obs}{v.agendamento ? ' · retorno ' + v.agendamento : ''}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
