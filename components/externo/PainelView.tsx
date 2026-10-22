import Link from 'next/link'
import { clsx } from 'clsx'
import FiltroPeriodo from '@/components/externo/FiltroPeriodo'
import TileDetalhe from '@/components/externo/TileDetalhe'
import {
  METAS, agregar, porSemana, oportunidades, agenda, retornosFeitos, segundaDe, dm,
  brl, pct, num, noPeriodo, rotuloSemana, classificar, paraLinha, recentesPrimeiro, type Periodo, type VisitaExt,
} from '@/lib/externo/metricas'

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
  const fu = retornosFeitos(visitas, periodo.de, periodo.ate)
  const fuAnt = retornosFeitos(visitas, periodo.antDe, periodo.antAte)
  const primeiras = s.visitas - fu.length
  const fuAtraso = fu.filter((r) => r.atrasoDias > 0).length
  const idsFu = new Set(fu.map((x) => x.visita.id))
  const ord = (l: ReturnType<typeof paraLinha>[]) => l.sort(recentesPrimeiro)
  const L = {
    todas: ord(doPeriodo.map((v) => paraLinha(v, idsFu.has(v.id) ? { etiqueta: 'Follow-up', cor: 'sky' } : { etiqueta: '1ª visita', cor: 'gray' }))),
    primeiras: ord(doPeriodo.filter((v) => !idsFu.has(v.id)).map((v) => paraLinha(v, { etiqueta: '1ª visita', cor: 'gray' }))),
    followups: ord(fu.map(({ visita: v, previsto, atrasoDias }) => paraLinha(v, !previsto ? { etiqueta: 'sem data marcada', cor: 'gray' }
      : atrasoDias > 0 ? { etiqueta: `${atrasoDias} dia(s) de atraso`, cor: 'red' } : { etiqueta: 'no prazo', cor: 'emerald' }))),
    vendas: ord(doPeriodo.filter((v) => classificar(v).vendeu).map((v) => paraLinha(v, { etiqueta: v.pecas_vendidas ? `${num(v.pecas_vendidas)} peças` : 'venda', cor: 'indigo', valor: brl(v.faturamento) }))),
    novos: ord(doPeriodo.filter((v) => classificar(v).clienteNovo).map((v) => paraLinha(v, { etiqueta: 'cliente novo', cor: 'emerald', valor: brl(v.faturamento) }))),
    proximo: ord(doPeriodo.filter((v) => classificar(v).proximoPasso).map((v) => paraLinha(v))),
    material: ord(doPeriodo.filter((v) => classificar(v).soMaterial).map((v) => paraLinha(v, { etiqueta: 'só material', cor: 'amber' }))),
    oportunidades: ord(doPeriodo.filter((v) => (v.expectativa_pecas || 0) > 0).map((v) => paraLinha(v, { etiqueta: v.possibilidade ? `chance ${v.possibilidade.toLowerCase()}` : undefined, cor: v.possibilidade === 'Alta' ? 'emerald' : v.possibilidade === 'Média' ? 'amber' : 'gray', valor: `${num(v.expectativa_pecas)} peças` }))),
  }
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <TileDetalhe titulo="Atividades" valor={num(s.visitas)} itens={L.todas} linha={temAnterior ? delta(s.visitas - a.visitas, (x) => num(x)) : null} linha2={`1ª visitas + follow-ups · meta ${metaVisitas}`} ok={s.visitas >= metaVisitas} />
        <TileDetalhe titulo="1ª visitas" valor={num(primeiras)} itens={L.primeiras} linha={temAnterior ? delta(primeiras - (a.visitas - fuAnt.length), (x) => num(x)) : null} linha2="Empresas visitadas pela primeira vez" />
        <TileDetalhe titulo="Follow-ups" valor={num(fu.length)} itens={L.followups} linha={temAnterior ? delta(fu.length - fuAnt.length, (x) => num(x)) : null} linha2={fu.length ? `${fu.filter((r) => r.previsto && !r.atrasoDias).length} no prazo · ${fuAtraso} com atraso · ${fu.filter((r) => !r.previsto).length} sem data marcada` : 'Retornos a empresas já visitadas'} ok={fu.length ? fuAtraso === 0 : undefined} />
        <TileDetalhe titulo="Faturamento vendido" valor={brl(s.faturamento)} itens={L.vendas} linha={temAnterior ? delta(s.faturamento - a.faturamento, brl) : null} linha2={s.vendas ? `${s.vendas} venda(s) · ${num(s.pecas)} peças` : 'Sem vendas no período'} />
        <TileDetalhe titulo="Clientes novos" valor={num(s.clientesNovos)} itens={L.novos} linha={temAnterior ? delta(s.clientesNovos - a.clientesNovos, (x) => num(x)) : null} linha2={`Meta: ${metaNovos} ou mais`} ok={s.clientesNovos >= metaNovos} />
        <TileDetalhe titulo="Com próximo passo" valor={pct(s.pctProximoPasso)} itens={L.proximo} linha={temAnterior ? delta(Math.round((s.pctProximoPasso - a.pctProximoPasso) * 100), (x) => x + ' p.p.') : null} linha2="Meta: 70% ou mais" ok={s.visitas ? s.pctProximoPasso >= METAS.pctProximoPasso : undefined} />
        <TileDetalhe titulo="Só material entregue" valor={pct(s.pctSoMaterial)} itens={L.material} linha={temAnterior ? delta(Math.round((s.pctSoMaterial - a.pctSoMaterial) * 100), (x) => x + ' p.p.') : null} linha2="Meta: até 20%" ok={s.visitas ? s.pctSoMaterial <= METAS.pctSoMaterial : undefined} />
        <TileDetalhe titulo="Peças em negociação" valor={num(s.expectativa)} itens={L.oportunidades} linha2={`${num(s.diasCampo)} dia(s) de campo · ${s.duracaoMedia ? num(s.duracaoMedia) + ' min por visita' : 'sem duração'}`} />
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
