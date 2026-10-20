import Link from 'next/link'
import { clsx } from 'clsx'
import FiltroPeriodo from '@/components/externo/FiltroPeriodo'
import {
  METAS, agregar, porSemana, oportunidades, agenda, segundaDe, dm,
  brl, pct, num, noPeriodo, rotuloSemana, type Periodo, type VisitaExt,
} from '@/lib/externo/metricas'

function Tile({ titulo, valor, linha1, linha2, ok }: { titulo: string; valor: string; linha1?: string | null; linha2?: string; ok?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 min-w-0">
      <p className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{titulo}</p>
      <p className="text-xl sm:text-2xl font-bold leading-tight text-gray-900 tabular-nums break-words">{valor}</p>
      {linha1 && <p className="text-xs text-gray-500 mt-1">{linha1}</p>}
      {linha2 && <p className={clsx('text-xs mt-0.5', ok === undefined ? 'text-gray-400' : ok ? 'text-emerald-600' : 'text-red-600')}>{linha2}</p>}
    </div>
  )
}

const delta = (v: number, f: (x: number) => string) => (Math.abs(v) < 1e-9 ? 'igual ao período anterior' : `${v > 0 ? '+' : '−'}${f(Math.abs(v))} vs. período anterior`)

interface Props {
  visitas: VisitaExt[]
  periodo: Periodo
  hoje: string
  gestor: boolean
  vendedores: { id: string; name: string }[]
  vendedorId?: string
  titulo: string
  erro?: string | null
}

export default function PainelView({ visitas, periodo, hoje, gestor, vendedores, vendedorId, titulo, erro }: Props) {
  const doPeriodo = visitas.filter((v) => noPeriodo(v, periodo.de, periodo.ate))
  const anterior = visitas.filter((v) => noPeriodo(v, periodo.antDe, periodo.antAte))
  const s = agregar(doPeriodo)
  const a = agregar(anterior)
  const temAnterior = anterior.length > 0
  const semanasNoPeriodo = Math.max(1, Math.round(periodo.dias / 7))
  const metaVisitas = METAS.visitas * semanasNoPeriodo
  const metaNovos = METAS.clientesNovos * semanasNoPeriodo

  // Semanas do gráfico: as do período; se o período for curto, as 8 semanas que terminam nele.
  const todas = porSemana(visitas)
  const iniGraf = segundaDe(periodo.de)
  let semanas = todas.filter((x) => x.semana >= iniGraf && x.semana <= periodo.ate)
  if (semanas.length < 2) semanas = todas.filter((x) => x.semana <= periodo.ate).slice(-8)
  const maxFat = Math.max(1, ...semanas.map((x) => x.faturamento))

  const ops = oportunidades(visitas.filter((v) => v.data_visita <= periodo.ate)).slice(0, 12)
  const ag = agenda(visitas, hoje)
  const retornos = [...ag.atrasados, ...ag.hoje, ...ag.proximos, ...ag.depois].slice(0, 12)
  const deHoje = visitas.filter((v) => v.data_visita === hoje).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
          <p className="text-sm text-gray-500">{deHoje} visita(s) registrada(s) hoje</p>
        </div>
      </div>

      {gestor && vendedores.length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Nenhum vendedor externo cadastrado nesta empresa ainda.</p>
      )}
      {gestor && vendedores.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {vendedores.map((v) => (
            <Link key={v.id} href={'?' + new URLSearchParams({ v: v.id, de: periodo.de, ate: periodo.ate })} className={clsx('rounded-full border px-3 py-1 text-sm', v.id === vendedorId ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700')}>{v.name}</Link>
          ))}
        </div>
      )}
      {erro && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não foi possível carregar as visitas: {erro}</p>}

      {(ag.hoje.length > 0 || ag.atrasados.length > 0) && (
        <Link href={`/dashboard/externo/agenda${gestor && vendedorId ? `?v=${vendedorId}` : ''}`} className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 hover:bg-indigo-100">
          <span className="text-sm text-indigo-900">
            <span className="font-bold">Agenda:</span> {ag.hoje.length} retorno(s) para hoje{ag.atrasados.length ? <> · <span className="font-semibold text-red-700">{ag.atrasados.length} atrasado(s)</span></> : null}
          </span>
          <span className="shrink-0 text-sm font-semibold text-indigo-700">Ver agenda →</span>
        </Link>
      )}

      <FiltroPeriodo de={periodo.de} ate={periodo.ate} atalho={periodo.atalho} rotulo={periodo.rotulo} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        <Tile titulo="Faturamento vendido" valor={brl(s.faturamento)} linha1={temAnterior ? delta(s.faturamento - a.faturamento, brl) : null} linha2={s.vendas ? `${s.vendas} venda(s) · ${num(s.pecas)} peças` : 'Sem vendas no período'} />
        <Tile titulo="Clientes novos" valor={num(s.clientesNovos)} linha1={temAnterior ? delta(s.clientesNovos - a.clientesNovos, (x) => num(x)) : null} linha2={`Meta: ${metaNovos} ou mais`} ok={s.clientesNovos >= metaNovos} />
        <Tile titulo="Visitas" valor={num(s.visitas)} linha1={temAnterior ? delta(s.visitas - a.visitas, (x) => num(x)) : null} linha2={`Meta: ${metaVisitas} · ${num(s.visitasDia, 1)} por dia de campo`} ok={s.visitas >= metaVisitas} />
        <Tile titulo="Com próximo passo" valor={pct(s.pctProximoPasso)} linha1={temAnterior ? delta(Math.round((s.pctProximoPasso - a.pctProximoPasso) * 100), (x) => x + ' p.p.') : null} linha2="Meta: 70% ou mais" ok={s.visitas ? s.pctProximoPasso >= METAS.pctProximoPasso : undefined} />
        <Tile titulo="Só material entregue" valor={pct(s.pctSoMaterial)} linha1={temAnterior ? delta(Math.round((s.pctSoMaterial - a.pctSoMaterial) * 100), (x) => x + ' p.p.') : null} linha2="Meta: até 20%" ok={s.visitas ? s.pctSoMaterial <= METAS.pctSoMaterial : undefined} />
        <Tile titulo="Peças em negociação" valor={num(s.expectativa)} linha2={`${num(s.diasCampo)} dia(s) de campo · ${s.duracaoMedia ? num(s.duracaoMedia) + ' min por visita' : 'sem duração'}`} />
      </div>
      <p className="text-xs text-gray-400">Período anterior para comparação: {dm(periodo.antDe)} a {dm(periodo.antAte)}. Metas de visitas e clientes novos proporcionais a {semanasNoPeriodo} semana(s).</p>

      <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
        <h3 className="font-semibold text-gray-900">Faturamento por semana</h3>
        {semanas.length === 0 ? (
          <p className="text-sm text-gray-500">Assim que as primeiras fichas forem salvas, a evolução aparece aqui.</p>
        ) : (
          <div className="space-y-2">
            {semanas.map((x) => {
              const dentro = x.semana >= iniGraf && x.semana <= periodo.ate
              return (
                <div key={x.semana} className="grid grid-cols-[5.5rem_1fr_5.5rem] sm:grid-cols-[6.5rem_1fr_6rem] items-center gap-2 text-xs sm:text-sm tabular-nums">
                  <span className="text-gray-600">{rotuloSemana(x.semana)}</span>
                  <span className="h-3 rounded-full bg-indigo-50 overflow-hidden"><span className={clsx('block h-full rounded-full', dentro ? 'bg-indigo-600' : 'bg-indigo-300')} style={{ width: `${(x.faturamento / maxFat) * 100}%` }} /></span>
                  <span className="text-right text-gray-700">{brl(x.faturamento)}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Retornos agendados</h3>
          {retornos.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum retorno com data marcada. Use “Reagendar” ao salvar a visita para ele aparecer aqui e na Agenda.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {retornos.map(({ ultima: v, data }) => (
                <li key={v.id}>
                  <Link href={`/dashboard/externo/ficha/nova?tipo=followup&empresa=${v.empresa_id}`} className="flex items-start justify-between gap-3 py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <span className="min-w-0">
                      <span className="font-medium text-gray-900">{v.cliente}</span>
                      <span className="block text-xs text-gray-500 line-clamp-2">{v.proximo_passo || v.obs || 'Sem anotação'} · visitada em {dm(v.data_visita)}</span>
                    </span>
                    <span className={clsx('shrink-0 rounded-full px-2 text-xs font-semibold', data && data < hoje ? 'bg-red-50 text-red-700' : data === hoje ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700')}>{data === hoje ? 'hoje' : dm(data)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Maiores oportunidades abertas</h3>
          {ops.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma oportunidade aberta.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {ops.map((v) => (
                <li key={v.id}>
                  <Link href={`/dashboard/externo/ficha/nova?empresa=${v.empresa_id}`} className="flex items-start justify-between gap-3 py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <span className="min-w-0">
                      <span className="font-medium text-gray-900">{v.cliente}</span>
                      <span className="block text-xs text-gray-500 line-clamp-2">{v.obs || 'Sem anotação'} · {dm(v.data_visita)}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className={clsx('inline-block rounded-full px-2 text-xs font-semibold', v.possibilidade === 'Alta' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{v.possibilidade}</span>
                      <span className="block text-sm tabular-nums text-gray-700">{num(v.expectativa_pecas)} peças</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
