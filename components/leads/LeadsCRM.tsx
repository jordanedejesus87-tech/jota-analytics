'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import FiltroPeriodo from '@/components/externo/FiltroPeriodo'
import LeadCard from '@/components/leads/LeadCard'
import { metricas, fmtMin, tempoResposta, META_RESPOSTA_MIN, dataSP, type LeadCRM } from '@/lib/leads/crm'
import type { Periodo } from '@/lib/externo/metricas'

interface Props {
  abertos: LeadCRM[]
  doPeriodo: LeadCRM[]
  periodo: Periodo
  hoje: string
  equipe: { id: string; name: string }[]
  podeEditar: boolean
  destaque?: string
  erro: string | null
}

const pct = (v: number) => Math.round(v * 100) + '%'
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function Card({ titulo, valor, linha, tom }: { titulo: string; valor: string; linha?: string; tom?: 'bom' | 'ruim' }) {
  return (
    <div className={clsx('rounded-xl border bg-white p-3 sm:p-4 min-w-0', tom === 'ruim' ? 'border-red-200' : 'border-gray-200')}>
      <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{titulo}</p>
      <p className={clsx('text-xl sm:text-2xl font-bold leading-tight tabular-nums', tom === 'bom' ? 'text-emerald-700' : tom === 'ruim' ? 'text-red-700' : 'text-gray-900')}>{valor}</p>
      {linha && <p className="text-xs text-gray-500 mt-1">{linha}</p>}
    </div>
  )
}

type Aba = 'novo' | 'em_atendimento' | 'orcado' | 'retornos' | 'fechados'

export default function LeadsCRM({ abertos, doPeriodo, periodo, hoje, equipe, podeEditar, destaque, erro }: Props) {
  const router = useRouter()
  const [, setTick] = useState(0)
  // atualiza o relógio de "aguardando há" e busca leads novos a cada 30 s
  useEffect(() => { const t = setInterval(() => { setTick((x) => x + 1); router.refresh() }, 30000); return () => clearInterval(t) }, [router])

  const nomes = new Map(equipe.map((p) => [p.id, p.name]))
  const doP = doPeriodo.filter((l) => dataSP(l.created_at) >= periodo.de && dataSP(l.created_at) <= periodo.ate)
  const m = metricas(doP)

  const listas: Record<Aba, LeadCRM[]> = {
    novo: abertos.filter((l) => l.status === 'novo'),
    em_atendimento: abertos.filter((l) => l.status === 'em_atendimento'),
    orcado: abertos.filter((l) => l.status === 'orcado'),
    retornos: abertos.filter((l) => l.retorno_em && l.status !== 'novo').sort((a, b) => (a.retorno_em! < b.retorno_em! ? -1 : 1)),
    fechados: doP.filter((l) => l.status === 'vendido' || l.status === 'perdido'),
  }
  const inicial: Aba = destaque ? ((['novo', 'em_atendimento', 'orcado'] as Aba[]).find((a) => listas[a].some((l) => l.id === destaque)) ?? 'novo') : listas.novo.length ? 'novo' : 'em_atendimento'
  const [aba, setAba] = useState<Aba>(inicial)
  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'novo', rotulo: 'Para responder' },
    { id: 'em_atendimento', rotulo: 'Em atendimento' },
    { id: 'orcado', rotulo: 'Orçamento enviado' },
    { id: 'retornos', rotulo: 'Retornos agendados' },
    { id: 'fechados', rotulo: 'Fechados no período' },
  ]

  // tempo de resposta por pessoa (leads do período já respondidos)
  const porPessoa = new Map<string, number[]>()
  for (const l of doP) if (l.respondido_em) { const k = l.respondido_por || 'sem'; porPessoa.set(k, [...(porPessoa.get(k) ?? []), tempoResposta(l)]) }

  const maisAntigo = listas.novo[0]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Leads do site</h1>
        <p className="text-sm text-gray-500">Orçamentos que chegam pelo laesc.com.br. Meta: responder em até {META_RESPOSTA_MIN} minutos no horário de atendimento.</p>
      </div>
      {erro && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não foi possível carregar os leads: {erro}</p>}

      {maisAntigo && (
        <button type="button" onClick={() => setAba('novo')} className="w-full text-left rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <b>{listas.novo.length} lead(s) aguardando resposta.</b> O mais antigo ({maisAntigo.nome}) espera há {fmtMin(tempoResposta(maisAntigo))} de expediente.
        </button>
      )}

      <FiltroPeriodo de={periodo.de} ate={periodo.ate} atalho={periodo.atalho} rotulo={periodo.rotulo} />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
        <Card titulo="Leads recebidos" valor={String(m.recebidos)} linha={`${m.aguardando} aguardando resposta`} />
        <Card titulo="Tempo de 1ª resposta" valor={fmtMin(m.mediaResposta)} linha={m.medianaResposta !== null ? `Metade respondida em até ${fmtMin(m.medianaResposta)}` : 'Média no expediente'} tom={m.mediaResposta === null ? undefined : m.mediaResposta <= META_RESPOSTA_MIN ? 'bom' : 'ruim'} />
        <Card titulo={`Respondidos em ${META_RESPOSTA_MIN} min`} valor={m.respondidos ? pct(m.pctAte15) : '—'} linha={`${m.emAte15} de ${m.respondidos} respondidos`} tom={!m.respondidos ? undefined : m.pctAte15 >= 0.8 ? 'bom' : 'ruim'} />
        <Card titulo="Orçamentos enviados" valor={String(m.orcados)} linha={`${pct(m.taxaOrcamento)} dos leads${m.valorOrcado ? ` · ${brl(m.valorOrcado)}` : ''}`} />
        <Card titulo="Vendas fechadas" valor={String(m.vendidos)} linha={`${pct(m.taxaVenda)} dos leads`} tom={m.vendidos ? 'bom' : undefined} />
        <Card titulo="Faturamento" valor={brl(m.faturamento)} linha={`${m.perdidos} não fecharam`} />
      </div>
      <p className="text-xs text-gray-400">O tempo conta só o horário de atendimento (seg a sex, 8h–12h e 13h30–18h, sem feriados). Lead que chega à noite começa a contar às 8h do próximo dia útil.</p>

      {(porPessoa.size > 0 || m.motivos.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-4">
          <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <h3 className="font-semibold text-gray-900">Tempo de resposta por pessoa</h3>
            {porPessoa.size === 0 ? <p className="text-sm text-gray-500">Nenhum lead respondido no período.</p> : (
              <table className="w-full text-sm tabular-nums">
                <thead><tr className="text-left text-xs uppercase tracking-wide text-gray-400"><th className="py-1.5 font-semibold">Quem respondeu</th><th className="py-1.5 text-right font-semibold">Leads</th><th className="py-1.5 text-right font-semibold">Média</th><th className="py-1.5 text-right font-semibold">Em {META_RESPOSTA_MIN} min</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.from(porPessoa, ([id, ts]) => {
                    const media = ts.reduce((a, b) => a + b, 0) / ts.length
                    const ok = ts.filter((t) => t <= META_RESPOSTA_MIN).length / ts.length
                    return (
                      <tr key={id}>
                        <td className="py-1.5 text-gray-900">{nomes.get(id) ?? 'Não identificado'}</td>
                        <td className="py-1.5 text-right">{ts.length}</td>
                        <td className={clsx('py-1.5 text-right font-semibold', media <= META_RESPOSTA_MIN ? 'text-emerald-700' : 'text-red-600')}>{fmtMin(media)}</td>
                        <td className="py-1.5 text-right">{pct(ok)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>
          <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <h3 className="font-semibold text-gray-900">Por que não fechou</h3>
            {m.motivos.length === 0 ? <p className="text-sm text-gray-500">Nenhum lead perdido no período.</p> : (
              <ul className="space-y-1.5">
                {m.motivos.map((x) => (
                  <li key={x.motivo} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                    <span className="min-w-0"><span className="text-gray-800">{x.motivo}</span>
                      <span className="block h-2 rounded-full bg-gray-100 mt-1 overflow-hidden"><span className="block h-full bg-gray-400 rounded-full" style={{ width: `${(x.qtd / m.perdidos) * 100}%` }} /></span></span>
                    <span className="tabular-nums font-semibold text-gray-700">{x.qtd}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" role="tablist">
        {abas.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)}
            className={clsx('shrink-0 rounded-full border px-3 py-1.5 text-sm', aba === a.id ? 'border-indigo-600 bg-indigo-600 text-white' : a.id === 'novo' && listas.novo.length ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-700')}>
            {a.rotulo} ({listas[a.id].length})
          </button>
        ))}
      </div>

      {listas[aba].length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
          {aba === 'novo' ? 'Nenhum lead esperando resposta.' : 'Nada nesta etapa.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {listas[aba].map((l) => (
            <LeadCard key={l.id} lead={l} hoje={hoje} podeEditar={podeEditar} destaque={l.id === destaque} nomeResponsavel={l.respondido_por ? nomes.get(l.respondido_por) : undefined} />
          ))}
        </ul>
      )}
    </div>
  )
}
