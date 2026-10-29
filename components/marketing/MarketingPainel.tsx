import Link from 'next/link'
import { clsx } from 'clsx'
import { ArrowRight, Info } from 'lucide-react'
import FiltroPeriodo from '@/components/externo/FiltroPeriodo'
import GraficoMarketing from '@/components/marketing/GraficoMarketing'
import BotaoAtualizar from '@/components/marketing/BotaoAtualizar'
import { brl, num, dm, type Periodo } from '@/lib/externo/metricas'
import { resumirAds, porCampanha, dataLead, type AdsDia, type SiteLead } from '@/lib/site/metricas'
import type { VendaIndividual } from '@/lib/comercial/origens'
import {
  resumirMidia, porCampanhaMidia, porAnuncioMidia, porPosicionamento, canaisAquisicao, funilMeta, funilGoogle, funilTiktok,
  somarFunis, serieMarketing, vendaMeta, vendaTiktok, div, POSICIONAMENTO, OBJETIVO,
  type Funil, type MidiaConta, type MidiaDia, type Plataforma,
} from '@/lib/marketing/metricas'

export type Aba = 'geral' | 'meta' | 'google' | 'tiktok'

interface Props {
  aba: Aba
  periodo: Periodo
  midia: MidiaDia[]
  ads: AdsDia[]
  vendas: VendaIndividual[]
  leads: SiteLead[]
  contas: MidiaConta[]
  ultimoGoogle: string | null
  podeAtualizar: boolean
  ehAdmin: boolean
  erro: string | null
}

const INICIO_VENDAS = '2026-10-29'
const pct1 = (v: number) => (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
const vezes = (v: number) => (v ? num(v, 1) + '×' : '—')
const ou = (cond: unknown, s: string) => (cond ? s : '—')
const quando = (s: string) => new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })

type Linha = { texto: string; bom?: boolean } | null
const comp = (atual: number, ant: number, f: (x: number) => string, menorMelhor = false): Linha => {
  if (!ant && !atual) return null
  if (!ant) return { texto: 'sem base no período anterior' }
  const d = atual - ant
  if (Math.abs(d) < 1e-9) return { texto: 'igual ao período anterior' }
  return { texto: `${d > 0 ? '+' : '−'}${f(Math.abs(d))} vs. período anterior`, bom: menorMelhor ? d < 0 : d > 0 }
}

function Card({ titulo, valor, linha, ajuda, destaque }: { titulo: string; valor: string; linha?: Linha; ajuda?: React.ReactNode; destaque?: string }) {
  return (
    <div className={clsx('rounded-xl border bg-white p-3 sm:p-4 min-w-0', destaque ?? 'border-gray-200')}>
      <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{titulo}</p>
      <p className="text-xl sm:text-2xl font-bold leading-tight tabular-nums text-gray-900 break-words">{valor}</p>
      {linha && <p className={clsx('text-xs mt-1', linha.bom === undefined ? 'text-gray-500' : linha.bom ? 'text-emerald-600' : 'text-red-600')}>{linha.texto}</p>}
      {ajuda && <p className="text-xs text-gray-400 mt-0.5">{ajuda}</p>}
    </div>
  )
}

function Secao({ titulo, sub, children, direita }: { titulo: string; sub?: React.ReactNode; children: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">{titulo}</h3>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        {direita}
      </div>
      {children}
    </section>
  )
}

const Th = ({ children, esq }: { children: React.ReactNode; esq?: boolean }) => <th className={clsx('py-2 px-2 font-semibold whitespace-nowrap', esq ? 'text-left pl-0' : 'text-right')}>{children}</th>
const Td = ({ children, forte, cls }: { children: React.ReactNode; forte?: boolean; cls?: string }) => <td className={clsx('py-2 px-2 text-right whitespace-nowrap', forte && 'font-semibold text-gray-900', cls)}>{children}</td>

// ── Custo por etapa: cada etapa do funil com o volume e o custo de cada unidade ──
function EtapasCusto({ f, rotuloContato }: { f: Funil; rotuloContato: string }) {
  const etapas = [
    { t: 'Investimento', v: brl(f.investimento), s: 'no período' },
    { t: 'Custo por mil impressões', v: ou(f.impressoes, brl(div(f.investimento, f.impressoes) * 1000)), s: `${num(f.impressoes)} impressões` },
    { t: 'Custo por clique', v: ou(f.cliques, brl(div(f.investimento, f.cliques))), s: `${num(f.cliques)} cliques` },
    { t: `Custo por ${rotuloContato}`, v: ou(f.contatos, brl(div(f.investimento, f.contatos))), s: `${num(f.contatos, f.contatos % 1 ? 1 : 0)} ${rotuloContato}s` },
    { t: 'Custo por venda', v: ou(f.vendas, brl(div(f.investimento, f.vendas))), s: `${num(f.vendas)} venda(s) · ${brl(f.faturamento)}` },
    { t: 'Retorno', v: vezes(div(f.faturamento, f.investimento)), s: 'faturamento ÷ investimento', ret: true },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
      {etapas.map((e, i) => (
        <div key={e.t} className={clsx('relative rounded-xl border p-3 min-w-0', e.ret ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-white')}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{i + 1}. {e.t}</p>
          <p className="text-lg sm:text-xl font-bold tabular-nums text-gray-900 mt-1">{e.v}</p>
          <p className="text-xs text-gray-500 mt-0.5">{e.s}</p>
        </div>
      ))}
    </div>
  )
}

function StatusConta({ nome, conta, envio, erro, cor }: { nome: string; conta?: string | null; envio: string | null; erro?: string | null; cor: string }) {
  const atrasado = envio ? Date.now() - new Date(envio).getTime() > 36 * 3600e3 : true
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs min-w-0">
      <span className={clsx('w-2 h-2 rounded-full shrink-0', erro ? 'bg-red-500' : !envio ? 'bg-gray-300' : atrasado ? 'bg-amber-500' : cor)} />
      <span className="font-semibold text-gray-800">{nome}</span>
      <span className="text-gray-500 truncate">
        {erro ? 'erro na última sincronização' : envio ? `atualizado em ${quando(envio)}` : conta ? 'aguardando a 1ª sincronização' : 'não conectado'}
      </span>
    </div>
  )
}

export default function MarketingPainel(p: Props) {
  const { periodo, aba } = p
  const noP = (d: string) => d >= periodo.de && d <= periodo.ate
  const noA = (d: string) => d >= periodo.antDe && d <= periodo.antAte

  const metaP = p.midia.filter((r) => r.plataforma === 'meta' && noP(r.data))
  const metaA = p.midia.filter((r) => r.plataforma === 'meta' && noA(r.data))
  const tikP = p.midia.filter((r) => r.plataforma === 'tiktok' && noP(r.data))
  const tikA = p.midia.filter((r) => r.plataforma === 'tiktok' && noA(r.data))
  const adsP = p.ads.filter((r) => noP(r.data)), adsA = p.ads.filter((r) => noA(r.data))
  const vendP = p.vendas.filter((v) => noP(v.sale_date)), vendA = p.vendas.filter((v) => noA(v.sale_date))
  const leadsP = p.leads.filter((l) => noP(dataLead(l))), leadsA = p.leads.filter((l) => noA(dataLead(l)))

  const m = resumirMidia(metaP), ma = resumirMidia(metaA)
  const t = resumirMidia(tikP), ta = resumirMidia(tikA)
  const g = resumirAds(adsP), ga = resumirAds(adsA)

  const fMeta = funilMeta(m, leadsP, vendP), fMetaA = funilMeta(ma, leadsA, vendA)
  const fGoogle = funilGoogle(adsP, leadsP, vendP), fGoogleA = funilGoogle(adsA, leadsA, vendA)
  const fTik = funilTiktok(t, vendP), fTikA = funilTiktok(ta, vendA)
  const total = somarFunis([fMeta, fGoogle, fTik]), totalA = somarFunis([fMetaA, fGoogleA, fTikA])

  const contaMeta = p.contas.find((c) => c.plataforma === 'meta')
  const contaTik = p.contas.find((c) => c.plataforma === 'tiktok')
  const invest: Record<Plataforma, number> = { meta: m.investimento, google: g.investimento, tiktok: t.investimento }
  const serie = serieMarketing(p.midia.filter((r) => noP(r.data)), adsP, periodo.de, periodo.ate)
  const plataformasGrafico = (['meta', 'google', 'tiktok'] as const).filter((x) => x !== 'tiktok' || t.investimento > 0)

  const q = (a: Aba) => {
    const s = new URLSearchParams()
    if (a !== 'geral') s.set('aba', a)
    if (periodo.atalho === 'custom') { s.set('de', periodo.de); s.set('ate', periodo.ate) } else s.set('p', periodo.atalho)
    return `/dashboard/marketing?${s.toString()}`
  }
  const ABAS: { id: Aba; rotulo: string; ponto: string }[] = [
    { id: 'geral', rotulo: 'Visão geral', ponto: 'bg-emerald-500' },
    { id: 'meta', rotulo: 'Meta Ads', ponto: 'bg-violet-600' },
    { id: 'google', rotulo: 'Google Ads', ponto: 'bg-sky-500' },
    { id: 'tiktok', rotulo: 'TikTok Ads', ponto: 'bg-slate-800' },
  ]
  const vendasAntesDoRegistro = periodo.de < INICIO_VENDAS

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Marketing e canais de aquisição</h1>
        <p className="text-sm text-gray-500">Quanto foi investido em anúncios, quantos contatos e vendas cada canal trouxe, e quanto voltou para cada real.</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0" aria-label="Seções do marketing">
        {ABAS.map((a) => (
          <Link key={a.id} href={q(a.id)} aria-current={aba === a.id ? 'page' : undefined}
            className={clsx('shrink-0 inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px', aba === a.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800')}>
            <span className={clsx('w-2 h-2 rounded-full', a.ponto)} />{a.rotulo}
          </Link>
        ))}
      </nav>

      {p.erro && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não foi possível carregar os dados: {p.erro}</p>}

      <div className="grid sm:grid-cols-3 gap-2">
        <StatusConta nome="Meta Ads" conta={contaMeta?.conta_id} envio={contaMeta?.ultimo_envio ?? null} erro={contaMeta?.ultimo_erro} cor="bg-violet-600" />
        <StatusConta nome="Google Ads" conta="google" envio={p.ultimoGoogle} cor="bg-sky-500" />
        <StatusConta nome="TikTok Ads" conta={contaTik?.conta_id} envio={contaTik?.ultimo_envio ?? null} erro={contaTik?.ultimo_erro} cor="bg-slate-800" />
      </div>

      <FiltroPeriodo de={periodo.de} ate={periodo.ate} atalho={periodo.atalho} rotulo={periodo.rotulo} />

      {/* ═════════════════════════ VISÃO GERAL ═════════════════════════ */}
      {aba === 'geral' && (<>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
          <Card titulo="Investido em anúncios" valor={brl(total.investimento)} linha={comp(total.investimento, totalA.investimento, brl)}
            ajuda={`Meta ${brl(m.investimento)} · Google ${brl(g.investimento)}${t.investimento ? ` · TikTok ${brl(t.investimento)}` : ''}`} />
          <Card titulo="Contatos dos anúncios" valor={num(total.contatos, total.contatos % 1 ? 1 : 0)} linha={comp(total.contatos, totalA.contatos, (x) => num(x, 1))} ajuda="Conversas, cadastros e WhatsApp/orçamentos do Google" />
          <Card titulo="Custo por contato" valor={ou(total.contatos, brl(div(total.investimento, total.contatos)))} linha={total.contatos && totalA.contatos ? comp(div(total.investimento, total.contatos), div(totalA.investimento, totalA.contatos), brl, true) : null} ajuda="Investimento ÷ contatos" />
          <Card titulo="Vendas de anúncio" valor={num(total.vendas)} linha={comp(total.vendas, totalA.vendas, (x) => num(x))} ajuda={brl(total.faturamento)} />
          <Card titulo="Custo por venda" valor={ou(total.vendas, brl(div(total.investimento, total.vendas)))} linha={total.vendas && totalA.vendas ? comp(div(total.investimento, total.vendas), div(totalA.investimento, totalA.vendas), brl, true) : null} ajuda="Custo de aquisição pago" destaque="border-indigo-200 ring-1 ring-indigo-100" />
          <Card titulo="Retorno dos anúncios" valor={vezes(div(total.faturamento, total.investimento))} ajuda="Faturamento ÷ investimento" destaque="border-amber-200 ring-1 ring-amber-100" />
        </div>

        <Secao titulo="Custo por etapa, por plataforma" sub="Cada linha é uma etapa do caminho até a venda. O número de cima é o volume; o de baixo, quanto custou cada unidade.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead><tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <Th esq>Etapa</Th><Th><span className="text-violet-700">Meta</span></Th><Th><span className="text-sky-700">Google</span></Th><Th>TikTok</Th><Th>Total</Th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {([
                  ['Investimento', (f: Funil) => brl(f.investimento), null],
                  ['Impressões', (f: Funil) => num(f.impressoes), (f: Funil) => ou(f.impressoes, brl(div(f.investimento, f.impressoes) * 1000) + ' / mil')],
                  ['Cliques', (f: Funil) => num(f.cliques), (f: Funil) => ou(f.cliques, brl(div(f.investimento, f.cliques)) + ' / clique')],
                  ['Contatos', (f: Funil) => num(f.contatos, f.contatos % 1 ? 1 : 0), (f: Funil) => ou(f.contatos, brl(div(f.investimento, f.contatos)) + ' / contato')],
                  ['Orçamentos pelo site', (f: Funil) => num(f.orcamentos), (f: Funil) => ou(f.orcamentos, brl(div(f.investimento, f.orcamentos)) + ' / orçamento')],
                  ['Vendas', (f: Funil) => num(f.vendas), (f: Funil) => ou(f.vendas, brl(div(f.investimento, f.vendas)) + ' / venda')],
                  ['Faturamento', (f: Funil) => brl(f.faturamento), (f: Funil) => ou(f.investimento && f.faturamento, vezes(div(f.faturamento, f.investimento)) + ' de retorno')],
                ] as [string, (f: Funil) => string, ((f: Funil) => string) | null][]).map(([rot, vol, custo]) => (
                  <tr key={rot}>
                    <td className="py-2 pr-2 font-medium text-gray-800 whitespace-nowrap">{rot}</td>
                    {[fMeta, fGoogle, fTik, total].map((f, i) => (
                      <td key={i} className={clsx('py-2 px-2 text-right whitespace-nowrap', i === 3 && 'bg-gray-50')}>
                        <span className={clsx('block', i === 3 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800')}>{vol(f)}</span>
                        {custo && <span className="block text-xs text-gray-500">{custo(f)}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">Contatos: Meta = conversas iniciadas (WhatsApp, Direct, Messenger) + cadastros; Google = cliques no WhatsApp + orçamentos (regra do Google Ads). Vendas: lançadas no Comercial com origem “anúncio” ou ligadas a um orçamento do site que veio de anúncio.</p>
        </Secao>

        <Secao titulo="Canais de aquisição: de onde vêm as vendas" sub="Base: vendas lançadas venda a venda no Comercial, com a pergunta “como você chegou até a LAESC?”.">
          {vendP.length === 0 ? <p className="text-sm text-gray-500">Nenhuma venda com origem registrada neste período.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead><tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <Th esq>Canal</Th><Th>Vendas</Th><Th>Faturamento</Th><Th>% do total</Th><Th>Ticket médio</Th><Th>Investido</Th><Th>Custo/venda</Th><Th>Retorno</Th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {canaisAquisicao(vendP, invest).map((c) => (
                    <tr key={c.id} className={clsx(!c.vendas && !c.investimento && 'opacity-40')}>
                      <td className="py-2 pr-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2 font-medium text-gray-900"><span className={clsx('w-2.5 h-2.5 rounded-sm', c.barra)} />{c.rotulo}</span>
                        {c.pago && <span className="ml-2 rounded-full bg-indigo-50 px-2 text-xs font-semibold text-indigo-700">pago</span>}
                      </td>
                      <Td>{num(c.vendas)}</Td>
                      <Td forte>{brl(c.faturamento)}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-2 justify-end">
                          <span className="hidden sm:inline-block w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden"><span className={clsx('block h-full', c.barra)} style={{ width: `${c.part * 100}%` }} /></span>
                          {pct1(c.part)}
                        </span>
                      </Td>
                      <Td>{c.vendas ? brl(c.ticket) : '—'}</Td>
                      <Td>{c.pago || c.investimento ? brl(c.investimento) : <span className="text-gray-300">R$ 0</span>}</Td>
                      <Td>{c.pago && c.vendas ? brl(c.custoVenda) : '—'}</Td>
                      <Td forte cls={c.pago && c.investimento ? (c.retorno >= 3 ? 'text-emerald-700' : c.retorno >= 1 ? 'text-amber-700' : 'text-red-700') : ''}>{c.pago && c.investimento ? vezes(c.retorno) : '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {vendasAntesDoRegistro && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Info className="w-4 h-4 shrink-0" />
              O registro venda a venda com origem começou em {dm(INICIO_VENDAS)}/2026. Antes disso as vendas foram lançadas pelo total do dia e não entram nesta tabela.
            </p>
          )}
          <p className="text-xs text-gray-500"><b>Como ler o retorno:</b> para o anúncio se pagar, o retorno precisa ser maior que 1 ÷ margem de contribuição. Com margem de 35%, por exemplo, abaixo de 2,9× o anúncio traz venda mas não paga o próprio custo. Verde a partir de 3×, amarelo entre 1× e 3×.</p>
        </Secao>

        <Secao titulo="Investimento e contatos por dia" sub="Barras: investimento por plataforma. Linha verde: contatos gerados pelos anúncios.">
          {total.investimento === 0 && total.contatos === 0 ? <p className="text-sm text-gray-500">Nenhum anúncio com gasto neste período.</p> : <GraficoMarketing serie={serie} plataformas={[...plataformasGrafico]} />}
        </Secao>
      </>)}

      {/* ═════════════════════════ META ADS ═════════════════════════ */}
      {aba === 'meta' && (<>
        {!contaMeta ? (
          <Secao titulo="Conectar o Meta Ads" sub="Assim que a conta de anúncios for conectada, os números entram sozinhos todo dia de madrugada, com o histórico desde 01/08/2026.">
            {p.ehAdmin ? (
              <ol className="list-decimal pl-5 space-y-1.5 text-sm text-gray-700">
                <li>No <b>Gerenciador de Negócios</b> da LAESC, copie o número da <b>conta de anúncios</b> (Configurações do negócio → Contas → Contas de anúncios).</li>
                <li>Em <b>Usuários → Usuários do sistema</b>, crie um usuário do sistema “Jota Analytics”, dê acesso de <b>leitura</b> à conta de anúncios e gere um token com a permissão <code className="rounded bg-gray-100 px-1">ads_read</code> (sem validade).</li>
                <li>Cadastre o token no Supabase, em <i>Edge Functions → Secrets</i>, com o nome <code className="rounded bg-gray-100 px-1">META_TOKEN_LAESC</code>. O token não fica salvo no banco nem aparece no navegador.</li>
                <li>Passe o número da conta para o Claude ligar a sincronização.</li>
              </ol>
            ) : (
              <p className="text-sm text-gray-600">A conta de anúncios do Meta ainda não foi conectada. A Jota Soluções está cuidando disso.</p>
            )}
          </Secao>
        ) : (
          <div className={clsx('flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-sm', contaMeta.ultimo_erro ? 'border-red-200 bg-red-50 text-red-800' : 'border-gray-200 bg-white text-gray-600')}>
            <span>
              Conta <b>{contaMeta.conta_nome || contaMeta.conta_id}</b>.{' '}
              {contaMeta.ultimo_erro ? `Última tentativa falhou: ${contaMeta.ultimo_erro}` : contaMeta.ultimo_envio ? `Atualizada em ${quando(contaMeta.ultimo_envio)}. Atualiza sozinha todo dia de madrugada.` : 'Aguardando a primeira sincronização.'}
            </span>
            {p.podeAtualizar && <BotaoAtualizar />}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card titulo="Investimento" valor={brl(m.investimento)} linha={comp(m.investimento, ma.investimento, brl)} ajuda={`${num(m.impressoes)} impressões`} />
          <Card titulo="Cliques no link" valor={num(m.cliquesLink)} linha={comp(m.cliquesLink, ma.cliquesLink, (x) => num(x))} ajuda={`Taxa de clique ${pct1(m.ctr)}`} />
          <Card titulo="Custo por clique" valor={ou(m.cliquesLink, brl(m.cpc))} linha={m.cliquesLink && ma.cliquesLink ? comp(m.cpc, ma.cpc, brl, true) : null} ajuda={`Custo por mil impressões ${ou(m.impressoes, brl(m.cpm))}`} />
          <Card titulo="Conversas iniciadas" valor={num(m.conversas)} linha={comp(m.conversas, ma.conversas, (x) => num(x))} ajuda="WhatsApp, Direct e Messenger" destaque="border-violet-200 ring-1 ring-violet-100" />
          <Card titulo="Custo por conversa" valor={ou(m.conversas, brl(m.custoConversa))} linha={m.conversas && ma.conversas ? comp(m.custoConversa, ma.custoConversa, brl, true) : null} ajuda="Investimento ÷ conversas" destaque="border-violet-200 ring-1 ring-violet-100" />
          <Card titulo="Cadastros (formulário)" valor={num(m.leads)} linha={comp(m.leads, ma.leads, (x) => num(x))} ajuda={m.leads ? `${brl(m.custoLead)} por cadastro` : 'Formulários do próprio Meta'} />
          <Card titulo="Vendas do Meta" valor={num(fMeta.vendas)} linha={comp(fMeta.vendas, fMetaA.vendas, (x) => num(x))} ajuda={`${brl(fMeta.faturamento)} · ${ou(fMeta.vendas, brl(div(m.investimento, fMeta.vendas)) + ' por venda')}`} />
          <Card titulo="Retorno" valor={vezes(div(fMeta.faturamento, m.investimento))} ajuda="Faturamento ÷ investimento" destaque="border-amber-200 ring-1 ring-amber-100" />
        </div>
        <p className="text-xs text-gray-400 -mt-2">Comparação com {dm(periodo.antDe)} a {dm(periodo.antAte)}. Vendas do Meta = lançadas no Comercial como “Instagram (anúncio)” ou “Facebook (anúncio)”.</p>

        <Secao titulo="Custo por etapa" sub="Do anúncio aparecendo até a venda fechada.">
          <EtapasCusto f={fMeta} rotuloContato="contato" />
        </Secao>

        <div className="grid gap-4">
          <Secao titulo="Instagram x Facebook" sub="Onde o anúncio apareceu.">
            {metaP.length === 0 ? <p className="text-sm text-gray-500">Sem dados no período.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead><tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100"><Th esq>Onde</Th><Th>Investido</Th><Th>Conversas</Th><Th>Custo/conversa</Th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {porPosicionamento(metaP).map((x) => (
                      <tr key={x.chave}>
                        <td className="py-2 pr-2 font-medium text-gray-900 whitespace-nowrap">{POSICIONAMENTO[x.chave] ?? x.chave}</td>
                        <Td>{brl(x.investimento)}<span className="block text-xs text-gray-400">{pct1(div(x.investimento, m.investimento))}</span></Td>
                        <Td>{num(x.contatos)}</Td>
                        <Td forte>{ou(x.contatos, brl(x.custoContato))}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Secao>

          <Secao titulo="Campanhas">
            {metaP.length === 0 ? <p className="text-sm text-gray-500">Nenhuma campanha com gasto no período.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead><tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <Th esq>Campanha</Th><Th>Investido</Th><Th>Impressões</Th><Th>Cliques</Th><Th>CPC</Th><Th>Conversas</Th><Th>Cadastros</Th><Th>Custo/contato</Th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {porCampanhaMidia(metaP).map((c) => (
                      <tr key={c.chave}>
                        <td className="py-2 pr-2 min-w-[12rem]"><span className="font-medium text-gray-900">{c.nome}</span>{c.objetivo && <span className="block text-xs text-gray-400">{OBJETIVO[c.objetivo] ?? c.objetivo}</span>}</td>
                        <Td forte>{brl(c.investimento)}</Td>
                        <Td>{num(c.impressoes)}</Td>
                        <Td>{num(c.cliquesLink)}</Td>
                        <Td>{ou(c.cliquesLink, brl(c.cpc))}</Td>
                        <Td>{num(c.conversas)}</Td>
                        <Td>{num(c.leads)}</Td>
                        <Td forte>{ou(c.contatos, brl(c.custoContato))}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Secao>
        </div>

        <Secao titulo="Anúncios (criativos)" sub="Em verde, os que trazem contato mais barato. Em vermelho, os que já gastaram R$ 30 ou mais sem nenhum contato: candidatos a pausar ou trocar a arte.">
          {metaP.length === 0 ? <p className="text-sm text-gray-500">Sem anúncios com gasto no período.</p> : (() => {
            const lista = porAnuncioMidia(metaP)
            const comContato = lista.filter((a) => a.contatos >= 3)
            const melhor = comContato.length > 1 ? comContato.reduce((a, b) => (b.custoContato < a.custoContato ? b : a)).chave : null
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead><tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <Th esq>Anúncio</Th><Th>Dias</Th><Th>Investido</Th><Th>Taxa de clique</Th><Th>Contatos</Th><Th>Custo/contato</Th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {lista.slice(0, 20).map((a) => {
                      const ruim = a.investimento >= 30 && a.contatos === 0
                      return (
                        <tr key={a.chave} className={clsx(ruim && 'bg-red-50/60', a.chave === melhor && 'bg-emerald-50/60')}>
                          <td className="py-2 pr-2 min-w-[14rem]">
                            <span className={clsx('font-medium', ruim ? 'text-red-700' : 'text-gray-900')}>{a.nome}</span>
                            {a.chave === melhor && <span className="ml-2 rounded-full bg-emerald-100 px-2 text-xs font-semibold text-emerald-700">melhor custo</span>}
                            <span className="block text-xs text-gray-400">{a.campanha}</span>
                          </td>
                          <Td>{a.dias}</Td>
                          <Td forte>{brl(a.investimento)}</Td>
                          <Td>{pct1(a.ctr)}</Td>
                          <Td>{num(a.contatos)}</Td>
                          <Td forte>{ou(a.contatos, brl(a.custoContato))}</Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </Secao>

        <Secao titulo="Investimento e contatos por dia">
          {m.investimento === 0 ? <p className="text-sm text-gray-500">Sem gasto no Meta neste período.</p> : <GraficoMarketing serie={serieMarketing(metaP, [], periodo.de, periodo.ate)} plataformas={['meta']} />}
        </Secao>
      </>)}

      {/* ═════════════════════════ GOOGLE ADS ═════════════════════════ */}
      {aba === 'google' && (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card titulo="Investimento" valor={brl(g.investimento)} linha={comp(g.investimento, ga.investimento, brl)} ajuda={`${num(g.impressoes)} impressões`} />
          <Card titulo="Cliques" valor={num(g.cliques)} linha={comp(g.cliques, ga.cliques, (x) => num(x))} ajuda={`Taxa de clique ${pct1(g.ctr)} · ${ou(g.cliques, brl(g.cpc))} por clique`} />
          <Card titulo="Contatos" valor={num(g.contatos, 1)} linha={comp(g.contatos, ga.contatos, (x) => num(x, 1))} ajuda={`${ou(g.contatos, brl(g.custoContato))} por contato`} destaque="border-indigo-200 ring-1 ring-indigo-100" />
          <Card titulo="Vendas do Google Ads" valor={num(fGoogle.vendas)} linha={comp(fGoogle.vendas, fGoogleA.vendas, (x) => num(x))} ajuda={`${brl(fGoogle.faturamento)} · retorno ${vezes(div(fGoogle.faturamento, g.investimento))}`} />
        </div>
        <Secao titulo="Custo por etapa">
          <EtapasCusto f={fGoogle} rotuloContato="contato" />
        </Secao>
        <Secao titulo="Campanhas" direita={<Link href="/dashboard/site" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">Painel completo do site e Google Ads <ArrowRight className="w-4 h-4" /></Link>}
          sub="Termos pesquisados, orçamentos do site e origem orgânica x paga ficam no painel completo.">
          {adsP.length === 0 ? <p className="text-sm text-gray-500">Nenhuma campanha com gasto no período.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead><tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100"><Th esq>Campanha</Th><Th>Investido</Th><Th>Cliques</Th><Th>CPC</Th><Th>Contatos</Th><Th>Custo/contato</Th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {porCampanha(adsP).map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-2 font-medium text-gray-900">{c.nome}</td>
                      <Td forte>{brl(c.investimento)}</Td><Td>{num(c.cliques)}</Td><Td>{brl(c.cpc)}</Td><Td>{num(c.contatos, 1)}</Td><Td forte>{ou(c.contatos, brl(c.custoContato))}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Secao>
      </>)}

      {/* ═════════════════════════ TIKTOK ═════════════════════════ */}
      {aba === 'tiktok' && (<>
        <Secao titulo="TikTok Ads: em preparação" sub="O espaço já está pronto aqui no painel. Os números entram assim que a LAESC tiver a conta de anúncios do TikTok.">
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="space-y-1.5">
              <p className="font-semibold text-gray-900">O que vai aparecer</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Investimento, visualizações e custo por mil</li>
                <li>Visualizações de 2 e 6 segundos (o vídeo prende ou não)</li>
                <li>Cliques, perfil visitado e mensagens</li>
                <li>Custo por contato, por venda e retorno, igual ao Meta</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-gray-900">O que falta</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Criar o <b>TikTok Business Center</b> e a conta de anúncios da LAESC</li>
                <li>Liberar o acesso do Jota Analytics à conta (aprovação do TikTok)</li>
              </ul>
            </div>
          </div>
        </Secao>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card titulo="Vendas com origem TikTok" valor={num(vendP.filter(vendaTiktok).length)} ajuda={brl(vendP.filter(vendaTiktok).reduce((s, v) => s + v.valor, 0))} />
          <Card titulo="Investimento" valor={brl(t.investimento)} ajuda={t.investimento ? undefined : 'Sem conta conectada'} />
        </div>
        <p className="text-xs text-gray-500">Mesmo antes do anúncio, as vendas lançadas no Comercial com origem “TikTok” já são contadas aqui e na visão geral.</p>
      </>)}

      {aba === 'meta' && vendP.filter(vendaMeta).length === 0 && m.investimento > 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Há investimento no Meta mas nenhuma venda lançada como “anúncio”. Sem isso, o painel mostra o custo mas não o retorno: peça à equipe para marcar a origem certa em cada venda.</p>
      )}
    </div>
  )
}
