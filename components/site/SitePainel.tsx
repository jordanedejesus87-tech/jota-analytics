import { clsx } from 'clsx'
import FiltroPeriodo from '@/components/externo/FiltroPeriodo'
import LeadLinha from '@/components/site/LeadLinha'
import { brl, num, dm, type Periodo } from '@/lib/externo/metricas'
import {
  resumirAds, resumirLeads, porCampanha, porTermo, serieDiaria, dataLead,
  type AdsDia, type AdsTermo, type SiteLead,
} from '@/lib/site/metricas'

interface Props {
  periodo: Periodo
  ads: AdsDia[]
  termos: AdsTermo[]
  leads: SiteLead[]
  ultimoEnvio: string | null
  erro: string | null
}

const pct1 = (v: number) => (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
const comp = (atual: number, ant: number, f: (x: number) => string, menorMelhor = false) => {
  if (!ant && !atual) return null
  const d = atual - ant
  if (Math.abs(d) < 1e-9) return { texto: 'igual ao período anterior', bom: undefined as boolean | undefined }
  return { texto: `${d > 0 ? '+' : '−'}${f(Math.abs(d))} vs. período anterior`, bom: menorMelhor ? d < 0 : d > 0 }
}

function Card({ titulo, valor, linha, ajuda, destaque }: { titulo: string; valor: string; linha?: { texto: string; bom?: boolean } | null; ajuda?: string; destaque?: boolean }) {
  return (
    <div className={clsx('rounded-xl border bg-white p-3 sm:p-4 min-w-0', destaque ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-200')}>
      <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{titulo}</p>
      <p className="text-xl sm:text-2xl font-bold leading-tight tabular-nums text-gray-900">{valor}</p>
      {linha && <p className={clsx('text-xs mt-1', linha.bom === undefined ? 'text-gray-500' : linha.bom ? 'text-emerald-600' : 'text-red-600')}>{linha.texto}</p>}
      {ajuda && <p className="text-xs text-gray-400 mt-0.5">{ajuda}</p>}
    </div>
  )
}

export default function SitePainel({ periodo, ads, termos, leads, ultimoEnvio, erro }: Props) {
  const noP = (d: string) => d >= periodo.de && d <= periodo.ate
  const noAnt = (d: string) => d >= periodo.antDe && d <= periodo.antAte
  const adsP = ads.filter((r) => noP(r.data))
  const adsA = ads.filter((r) => noAnt(r.data))
  const leadsP = leads.filter((l) => noP(dataLead(l)))
  const leadsA = leads.filter((l) => noAnt(dataLead(l)))

  const a = resumirAds(adsP), aa = resumirAds(adsA)
  const l = resumirLeads(leadsP), la = resumirLeads(leadsA)
  const retorno = a.investimento ? l.faturamento / a.investimento : 0
  const campanhas = porCampanha(adsP)
  const listaTermos = porTermo(termos).slice(0, 20)
  const serie = serieDiaria(adsP, leadsP, periodo.de, periodo.ate)
  const maxInv = Math.max(1, ...serie.map((d) => d.investimento))
  const semDados = ads.length === 0

  const envioAtrasado = ultimoEnvio ? Date.now() - new Date(ultimoEnvio).getTime() > 36 * 3600e3 : true

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Site e Google Ads</h1>
        <p className="text-sm text-gray-500">Quanto foi investido no Google, quantos contatos o site gerou e quantos viraram venda.</p>
      </div>

      {erro && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não foi possível carregar os dados: {erro}</p>}
      <p className={clsx('rounded-lg border px-4 py-2.5 text-sm', envioAtrasado ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-gray-200 bg-white text-gray-600')}>
        {ultimoEnvio
          ? <>Google Ads sincronizado em {new Date(ultimoEnvio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}. Os números do Google chegam uma vez por dia, com os dados até ontem.{envioAtrasado ? ' A última sincronização tem mais de 36 horas: confira o script na conta do Google Ads.' : ''}</>
          : <>O Google Ads ainda não enviou dados. Assim que o script agendado na conta rodar pela primeira vez, os números aparecem aqui.</>}
      </p>

      <FiltroPeriodo de={periodo.de} ate={periodo.ate} atalho={periodo.atalho} rotulo={periodo.rotulo} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Google Ads</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card titulo="Investimento" valor={brl(a.investimento)} linha={comp(a.investimento, aa.investimento, brl)} ajuda={`${num(a.impressoes)} impressões`} />
          <Card titulo="Cliques" valor={num(a.cliques)} linha={comp(a.cliques, aa.cliques, (x) => num(x))} ajuda={`Taxa de clique ${pct1(a.ctr)}`} />
          <Card titulo="Custo por clique" valor={brl(a.cpc)} linha={comp(a.cpc, aa.cpc, brl, true)} ajuda="Média do período" />
          <Card titulo="Contatos pelo anúncio" valor={num(a.contatos, 1)} linha={comp(a.contatos, aa.contatos, (x) => num(x, 1))} ajuda={`${num(a.convWhatsapp, 1)} WhatsApp · ${num(a.convOrcamento, 1)} orçamentos`} destaque />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Resultado</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card titulo="Custo por contato" valor={a.contatos ? brl(a.custoContato) : '—'} linha={a.contatos && aa.contatos ? comp(a.custoContato, aa.custoContato, brl, true) : null} ajuda="Investimento ÷ contatos do anúncio" destaque />
          <Card titulo="Orçamentos pelo site" valor={num(l.total)} linha={comp(l.total, la.total, (x) => num(x))} ajuda={`${num(l.google)} vieram de anúncio · ${num(l.abertos)} ainda em aberto`} />
          <Card titulo="Vendas fechadas" valor={num(l.vendidos)} linha={comp(l.vendidos, la.vendidos, (x) => num(x))} ajuda={l.total ? `${pct1(l.vendidos / l.total)} dos orçamentos do site` : 'Marque “Vendido” na lista abaixo'} />
          <Card titulo="Faturamento do site" valor={brl(l.faturamento)} linha={comp(l.faturamento, la.faturamento, brl)} ajuda={a.investimento ? `Retorno: ${num(retorno, 1)}× o investimento` : 'Soma das vendas marcadas'} destaque />
        </div>
        <p className="text-xs text-gray-400">Comparação com {dm(periodo.antDe)} a {dm(periodo.antAte)}. Quem clica direto no botão de WhatsApp conta como contato do anúncio, mas só os orçamentos preenchidos no site aparecem na lista abaixo.</p>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-gray-900">Investimento e contatos por dia</h3>
          <span className="text-xs text-gray-500"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-indigo-600 mr-1 align-middle" />investimento · número à direita = contatos (anúncio) / orçamentos (site)</span>
        </div>
        {semDados && leadsP.length === 0 ? (
          <p className="text-sm text-gray-500">Sem dados no período ainda.</p>
        ) : (
          <div className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-1">
            {serie.slice().reverse().map((d) => (
              <div key={d.data} className="grid grid-cols-[3rem_1fr_5.5rem_3.5rem] sm:grid-cols-[3.5rem_1fr_6.5rem_4rem] items-center gap-2 text-xs sm:text-sm tabular-nums">
                <span className="text-gray-600">{dm(d.data)}</span>
                <span className="h-3 rounded-full bg-indigo-50 overflow-hidden"><span className="block h-full rounded-full bg-indigo-600" style={{ width: `${(d.investimento / maxInv) * 100}%` }} /></span>
                <span className="text-right text-gray-700">{brl(d.investimento)}</span>
                <span className={clsx('text-right font-semibold', d.contatos + d.leads ? 'text-emerald-700' : 'text-gray-300')}>{num(d.contatos, 1)} / {d.leads}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid xl:grid-cols-2 gap-4">
        <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3 min-w-0">
          <h3 className="font-semibold text-gray-900">Campanhas</h3>
          {campanhas.length === 0 ? <p className="text-sm text-gray-500">Nenhuma campanha com gasto no período.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead><tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3 font-semibold">Campanha</th><th className="py-2 px-2 text-right font-semibold">Investido</th><th className="py-2 px-2 text-right font-semibold">Cliques</th><th className="py-2 px-2 text-right font-semibold">CPC</th><th className="py-2 px-2 text-right font-semibold">Contatos</th><th className="py-2 pl-2 text-right font-semibold">Custo/contato</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {campanhas.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-3"><span className="font-medium text-gray-900">{c.nome}</span>{c.status && c.status !== 'ENABLED' && <span className="ml-2 rounded-full bg-gray-100 px-2 text-xs text-gray-500">{c.status === 'PAUSED' ? 'pausada' : c.status.toLowerCase()}</span>}</td>
                      <td className="py-2 px-2 text-right">{brl(c.investimento)}</td>
                      <td className="py-2 px-2 text-right">{num(c.cliques)}</td>
                      <td className="py-2 px-2 text-right">{brl(c.cpc)}</td>
                      <td className="py-2 px-2 text-right">{num(c.contatos, 1)}</td>
                      <td className="py-2 pl-2 text-right">{c.contatos ? brl(c.custoContato) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3 min-w-0">
          <div>
            <h3 className="font-semibold text-gray-900">O que as pessoas pesquisaram</h3>
            <p className="text-xs text-gray-500">Termos que mais custaram. Os marcados em vermelho gastaram sem gerar contato: candidatos a palavra negativa.</p>
          </div>
          {listaTermos.length === 0 ? <p className="text-sm text-gray-500">Sem termos de pesquisa no período.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead><tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3 font-semibold">Termo</th><th className="py-2 px-2 text-right font-semibold">Cliques</th><th className="py-2 px-2 text-right font-semibold">Custo</th><th className="py-2 pl-2 text-right font-semibold">Contatos</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {listaTermos.map((t) => {
                    const ruim = t.custo >= 15 && t.conversoes === 0
                    return (
                      <tr key={t.termo}>
                        <td className={clsx('py-2 pr-3', ruim ? 'text-red-700 font-medium' : 'text-gray-900')}>{t.termo}</td>
                        <td className="py-2 px-2 text-right">{num(t.cliques)}</td>
                        <td className="py-2 px-2 text-right">{brl(t.custo)}</td>
                        <td className="py-2 pl-2 text-right">{num(t.conversoes, 1)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900">Orçamentos recebidos pelo site</h3>
          <p className="text-xs text-gray-500">Atualize a situação de cada pedido. Ao marcar “Vendido” com o valor, o faturamento e o retorno do anúncio aparecem nos cartões acima.</p>
        </div>
        {leadsP.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum orçamento pelo site neste período.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {leadsP.map((lead) => <LeadLinha key={lead.id} lead={lead} />)}
          </ul>
        )}
      </section>
    </div>
  )
}
