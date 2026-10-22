import Link from 'next/link'
import { clsx } from 'clsx'
import FiltroPeriodo from '@/components/externo/FiltroPeriodo'
import TileDetalhe from '@/components/externo/TileDetalhe'
import {
  METAS, resumoGestao, retornosFeitos, agenda, oportunidades, porRota, porSemana, segundaDe, noPeriodo,
  dm, brl, pct, num, diasDeAtraso, rotuloSemana, classificar, dataRetorno, paraLinha, recentesPrimeiro, type Periodo, type VisitaExt, type ItemAgenda,
} from '@/lib/externo/metricas'

function Painel({ titulo, children, extra }: { titulo: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-gray-800">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  )
}

const varia = (a: number, b: number, f: (x: number) => string) => (b === 0 && a === 0 ? null : <span className={a >= b ? 'text-emerald-700' : 'text-red-600'}>{a >= b ? '▲' : '▼'} {f(Math.abs(a - b))} vs. período anterior</span>)

function ListaAgenda({ itens, hoje, vazio }: { itens: ItemAgenda[]; hoje: string; vazio: string }) {
  if (!itens.length) return <p className="px-4 py-4 text-sm text-gray-500 sm:px-5">{vazio}</p>
  return (
    <ul className="divide-y divide-gray-50">
      {itens.map(({ ultima: v, data }) => (
        <li key={v.empresa_id} className="flex items-start justify-between gap-3 px-4 py-2.5 sm:px-5">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-gray-900">{v.cliente} <span className="text-xs font-normal text-gray-400">· {v.rota}</span></span>
            <span className="block text-xs text-gray-500 line-clamp-2">{v.proximo_passo || v.obs || 'Sem anotação'} · última visita {dm(v.data_visita)}</span>
          </span>
          {data && (
            <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums', data < hoje ? 'bg-red-50 text-red-700' : data === hoje ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700')}>
              {data < hoje ? `${diasDeAtraso(data, hoje)} dia(s) de atraso` : data === hoje ? 'hoje' : dm(data)}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

interface Props {
  visitas: VisitaExt[]
  periodo: Periodo
  hoje: string
  vendedores: { id: string; name: string }[]
  vendedorId?: string
  nome?: string
}

export default function ResultadosView({ visitas, periodo, hoje, vendedores, vendedorId, nome }: Props) {
  const r = resumoGestao(visitas, periodo.de, periodo.ate)
  const a = resumoGestao(visitas, periodo.antDe, periodo.antAte)
  const temAnterior = a.visitas > 0
  const ag = agenda(visitas, hoje)
  const feitos = retornosFeitos(visitas, periodo.de, periodo.ate).reverse()
  const ops = oportunidades(visitas.filter((v) => v.data_visita <= periodo.ate)).slice(0, 10)
  const doPeriodo = visitas.filter((v) => noPeriodo(v, periodo.de, periodo.ate))
  const rotas = porRota(doPeriodo)
  const semanasN = Math.max(1, Math.round(periodo.dias / 7))
  const metaVisitas = METAS.visitas * semanasN

  // Semanas: as do período; período curto → as últimas 8 até o fim dele.
  const fu = new Set(retornosFeitos(visitas, '0000-01-01', '9999-12-31').map((x) => x.visita.id))
  let semanas = porSemana(visitas).filter((s) => s.semana >= segundaDe(periodo.de) && s.semana <= periodo.ate)
  if (semanas.length < 2) semanas = porSemana(visitas).filter((s) => s.semana <= periodo.ate).slice(-8)

  // Listas dos cards clicáveis
  const fuPeriodo = retornosFeitos(visitas, periodo.de, periodo.ate)
  const idsFu = new Set(fuPeriodo.map((x) => x.visita.id))
  const ord = (l: ReturnType<typeof paraLinha>[]) => l.sort(recentesPrimeiro)
  const L = {
    todas: ord(doPeriodo.map((v) => paraLinha(v, idsFu.has(v.id) ? { etiqueta: 'Follow-up', cor: 'sky' } : { etiqueta: '1ª visita', cor: 'gray' }))),
    primeiras: ord(doPeriodo.filter((v) => !idsFu.has(v.id)).map((v) => paraLinha(v, { etiqueta: '1ª visita', cor: 'gray' }))),
    followups: ord(fuPeriodo.map(({ visita: v, previsto, atrasoDias }) => paraLinha(v, !previsto
      ? { etiqueta: 'sem data marcada', cor: 'gray' }
      : atrasoDias > 0 ? { etiqueta: `${atrasoDias} dia(s) de atraso (previsto ${dm(previsto)})`, cor: 'red' } : { etiqueta: `no prazo (previsto ${dm(previsto)})`, cor: 'emerald' }))),
    atrasados: ag.atrasados.map(({ ultima: v, data }) => paraLinha(v, { etiqueta: `${diasDeAtraso(data!, hoje)} dia(s) de atraso · era ${dm(data)}`, cor: 'red', texto: v.proximo_passo || v.obs || null })),
    vendas: ord(doPeriodo.filter((v) => classificar(v).vendeu).map((v) => paraLinha(v, { etiqueta: v.pecas_vendidas ? `${num(v.pecas_vendidas)} peças` : 'venda', cor: 'indigo', valor: brl(v.faturamento) }))),
    oportunidades: ord(doPeriodo.filter((v) => (v.expectativa_pecas || 0) > 0 && (v.possibilidade === 'Alta' || v.possibilidade === 'Média') && !classificar(v).vendeu)
      .map((v) => paraLinha(v, { etiqueta: `chance ${v.possibilidade!.toLowerCase()}`, cor: v.possibilidade === 'Alta' ? 'emerald' : 'amber', valor: `${num(v.expectativa_pecas)} peças` }))),
    novos: ord(doPeriodo.filter((v) => classificar(v).clienteNovo).map((v) => paraLinha(v, { etiqueta: 'cliente novo', cor: 'emerald', valor: brl(v.faturamento) }))),
    duracao: doPeriodo.filter((v) => v.duracao_min).sort((x, y) => (y.duracao_min || 0) - (x.duracao_min || 0)).map((v) => paraLinha(v, { valor: `${v.duracao_min} min` })),
    proximo: ord(doPeriodo.filter((v) => classificar(v).proximoPasso).map((v) => paraLinha(v))),
    material: ord(doPeriodo.filter((v) => classificar(v).soMaterial).map((v) => paraLinha(v, { etiqueta: 'só material', cor: 'amber' }))),
    comRetorno: ord(doPeriodo.filter((v) => dataRetorno(v)).map((v) => paraLinha(v, { etiqueta: `retorno ${dm(dataRetorno(v))}`, cor: 'sky' }))),
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Resultados · vendas externas{nome ? ` · ${nome}` : ''}</h2>
        <p className="text-sm text-gray-500">Visitas, retornos, agenda, vendas e oportunidades do vendedor externo.</p>
      </div>

      {vendedores.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {vendedores.map((v) => (
            <Link key={v.id} href={'?' + new URLSearchParams({ v: v.id, de: periodo.de, ate: periodo.ate })} className={clsx('rounded-full border px-3 py-1 text-sm', v.id === vendedorId ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700')}>{v.name}</Link>
          ))}
        </div>
      )}
      {vendedores.length === 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Nenhum vendedor externo cadastrado nesta empresa.</p>}

      <FiltroPeriodo de={periodo.de} ate={periodo.ate} atalho={periodo.atalho} rotulo={periodo.rotulo} />

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <TileDetalhe titulo="Atividades" valor={num(r.visitas)} ok={r.visitas >= metaVisitas} itens={L.todas}
          linha={<>1ª visitas + follow-ups · meta {metaVisitas}<br />{num(r.visitasDia, 1)} por dia de campo · {r.empresas} empresa(s)</>} />
        <TileDetalhe titulo="1ª visitas" valor={num(r.primeiras)} itens={L.primeiras} linha="Empresas visitadas pela primeira vez" />
        <TileDetalhe titulo="Follow-ups" valor={num(r.followups)} itens={L.followups}
          linha={<>{r.retornosNoPrazo} no prazo · <span className={r.retornosAtrasados ? 'text-red-600 font-semibold' : ''}>{r.retornosAtrasados} com atraso</span>{r.retornosAtrasados ? ` (média ${num(r.atrasoMedio, 1)} dia(s))` : ''}{r.retornosSemAgenda ? ` · ${r.retornosSemAgenda} sem data marcada` : ''}</>} />
        <TileDetalhe titulo="Retornos em atraso hoje" valor={num(ag.atrasados.length)} alerta={ag.atrasados.length > 0} itens={L.atrasados} subtitulo="Retornos marcados que ainda não foram feitos"
          linha={`${ag.hoje.length} para hoje · ${ag.proximos.length} nos próximos 7 dias`} />
        <TileDetalhe titulo="Vendas" valor={num(r.vendas)} itens={L.vendas}
          linha={<>{num(r.pecas)} peças · conversão {pct(r.conversao)}{temAnterior ? <><br />{varia(r.vendas, a.vendas, (x) => num(x))}</> : null}</>} />
        <TileDetalhe titulo="Faturamento vendido" valor={brl(r.faturamento)} itens={L.vendas}
          linha={<>Ticket médio {r.vendas ? brl(r.ticketMedio) : '—'}{temAnterior ? <><br />{varia(r.faturamento, a.faturamento, brl)}</> : null}</>} />
        <TileDetalhe titulo="Oportunidades geradas" valor={num(r.oportunidades)} itens={L.oportunidades} linha={`${num(r.pecasOportunidade)} peças em negociação (chance alta/média)`} />
        <TileDetalhe titulo="Clientes novos" valor={num(r.clientesNovos)} ok={r.clientesNovos >= METAS.clientesNovos * semanasN} itens={L.novos} linha={`Meta ${METAS.clientesNovos * semanasN} no período`} />
        <TileDetalhe titulo="Tempo médio de visita" valor={r.duracaoMedia ? `${num(r.duracaoMedia)} min` : '—'} itens={L.duracao} subtitulo="Da visita mais longa para a mais curta"
          linha={`${r.diasCampo} dia(s) de campo`} />
        <TileDetalhe titulo="Com próximo passo" valor={pct(r.pctProximoPasso)} ok={r.visitas ? r.pctProximoPasso >= METAS.pctProximoPasso : undefined} itens={L.proximo} linha="Meta: 70% ou mais" />
        <TileDetalhe titulo="Só material entregue" valor={pct(r.pctSoMaterial)} alerta={r.visitas > 0 && r.pctSoMaterial > METAS.pctSoMaterial} itens={L.material} linha="Meta: até 20%" />
        <TileDetalhe titulo="Visitas com retorno marcado" valor={r.visitas ? pct(r.comRetornoMarcado / r.visitas) : '—'} itens={L.comRetorno} linha={`${r.comRetornoMarcado} de ${r.visitas} saíram com data de retorno`} />
      </div>
      <p className="text-xs text-gray-400">Período anterior para comparação: {dm(periodo.antDe)} a {dm(periodo.antAte)}. Metas de visitas e clientes novos proporcionais a {semanasN} semana(s).</p>

      {/* Agenda */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo={`Retornos atrasados · ${ag.atrasados.length}`} extra={<Link href={`/dashboard/externo/agenda${vendedorId ? `?v=${vendedorId}` : ''}`} className="text-xs font-semibold text-indigo-700 underline">Agenda completa</Link>}>
          <ListaAgenda itens={ag.atrasados} hoje={hoje} vazio="Nenhum retorno atrasado." />
        </Painel>
        <Painel titulo={`Agenda de hoje e próximos 7 dias · ${ag.hoje.length + ag.proximos.length}`}>
          <ListaAgenda itens={[...ag.hoje, ...ag.proximos]} hoje={hoje} vazio="Nenhum retorno marcado para os próximos dias." />
        </Painel>
      </div>

      {/* Retornos feitos */}
      <Painel titulo={`Retornos feitos no período · ${feitos.length}`}>
        {feitos.length === 0 ? <p className="px-4 py-4 text-sm text-gray-500 sm:px-5">Nenhum follow-up no período.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400"><th className="px-4 py-2 text-left font-medium">Empresa</th><th className="px-3 py-2 text-left font-medium">Previsto</th><th className="px-3 py-2 text-left font-medium">Feito</th><th className="px-3 py-2 text-left font-medium">Situação</th><th className="px-4 py-2 text-left font-medium">Próximo passo</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {feitos.map(({ visita: v, previsto, atrasoDias }) => (
                  <tr key={v.id}>
                    <td className="px-4 py-2"><Link href={`/dashboard/externo/ficha/${v.id}`} className="font-medium text-gray-900 hover:underline">{v.cliente}</Link></td>
                    <td className="px-3 py-2 tabular-nums text-gray-600">{previsto ? dm(previsto) : '—'}</td>
                    <td className="px-3 py-2 tabular-nums text-gray-600">{dm(v.data_visita)}</td>
                    <td className="px-3 py-2">
                      {!previsto ? <span className="rounded-full bg-gray-100 px-2 text-xs font-semibold text-gray-600">sem data marcada</span>
                        : atrasoDias > 0 ? <span className="rounded-full bg-red-50 px-2 text-xs font-semibold text-red-700">{atrasoDias} dia(s) de atraso</span>
                        : <span className="rounded-full bg-emerald-50 px-2 text-xs font-semibold text-emerald-700">no prazo</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-600 max-w-[22rem] truncate">{v.proximo_passo || v.obs || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Painel>

      {/* Evolução semanal */}
      <Painel titulo="Evolução por semana">
        {semanas.length === 0 ? <p className="px-4 py-4 text-sm text-gray-500 sm:px-5">Sem visitas ainda.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400"><th className="px-4 py-2 text-left font-medium">Semana</th><th className="px-3 py-2 text-right font-medium">Visitas</th><th className="px-3 py-2 text-right font-medium">1ª visita</th><th className="px-3 py-2 text-right font-medium">Follow-up</th><th className="px-3 py-2 text-right font-medium">Vendas</th><th className="px-3 py-2 text-right font-medium">Faturamento</th><th className="px-3 py-2 text-right font-medium">Tempo médio</th><th className="px-4 py-2 text-right font-medium">Próx. passo</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {semanas.map((s) => {
                  const dela = visitas.filter((v) => segundaDe(v.data_visita) === s.semana)
                  const nf = dela.filter((v) => fu.has(v.id)).length
                  return (
                    <tr key={s.semana}>
                      <td className="px-4 py-2 text-gray-700">{rotuloSemana(s.semana)}</td>
                      <td className={clsx('px-3 py-2 text-right tabular-nums font-semibold', s.visitas >= METAS.visitas ? 'text-emerald-700' : 'text-gray-900')}>{s.visitas}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{s.visitas - nf}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{nf}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{s.vendas}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-900">{brl(s.faturamento)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{s.duracaoMedia ? `${num(s.duracaoMedia)} min` : '—'}</td>
                      <td className={clsx('px-4 py-2 text-right tabular-nums', s.pctProximoPasso >= METAS.pctProximoPasso ? 'text-emerald-700' : 'text-red-600')}>{pct(s.pctProximoPasso)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Painel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Oportunidades */}
        <Painel titulo="Maiores oportunidades abertas">
          {ops.length === 0 ? <p className="px-4 py-4 text-sm text-gray-500 sm:px-5">Nenhuma oportunidade aberta.</p> : (
            <ul className="divide-y divide-gray-50">
              {ops.map((v) => (
                <li key={v.id} className="flex items-start justify-between gap-3 px-4 py-2.5 sm:px-5">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">{v.cliente} <span className="text-xs font-normal text-gray-400">· {v.rota}</span></span>
                    <span className="block text-xs text-gray-500 line-clamp-2">{v.proximo_passo || v.obs || 'Sem anotação'} · {dm(v.data_visita)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={clsx('inline-block rounded-full px-2 text-xs font-semibold', v.possibilidade === 'Alta' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{v.possibilidade}</span>
                    <span className="block text-sm tabular-nums text-gray-700">{num(v.expectativa_pecas)} peças</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Painel>

        {/* Rotas */}
        <Painel titulo="Resultado por rota no período">
          {rotas.length === 0 ? <p className="px-4 py-4 text-sm text-gray-500 sm:px-5">Sem visitas no período.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead><tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400"><th className="px-4 py-2 text-left font-medium">Rota</th><th className="px-3 py-2 text-right font-medium">Visitas</th><th className="px-3 py-2 text-right font-medium">Vendas</th><th className="px-4 py-2 text-right font-medium">Faturamento</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {rotas.map((x) => (
                    <tr key={x.rota}><td className="px-4 py-2 text-gray-800">{x.rota}</td><td className="px-3 py-2 text-right tabular-nums">{x.visitas}</td><td className="px-3 py-2 text-right tabular-nums">{x.vendas}</td><td className="px-4 py-2 text-right tabular-nums font-semibold">{brl(x.faturamento)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Painel>
      </div>
    </div>
  )
}
