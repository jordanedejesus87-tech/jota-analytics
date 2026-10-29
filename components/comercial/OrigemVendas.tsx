'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { Info, Megaphone } from 'lucide-react'
import { brl, pct, num, dm, type Venda } from '@/lib/comercial/metricas'
import { ORIGENS, infoOrigem, CANAL_ROTULO, type VendaIndividual } from '@/lib/comercial/origens'

// Origem das vendas: de onde vem o faturamento, venda a venda.
// Base: tabela public.vendas (registro individual, desde 29/10/2026).

const INICIO = '2026-10-29'
const iso = (d: Date) => d.toISOString().slice(0, 10)
const somar = (s: string, n: number) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d) }

const ATALHOS = [
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes_passado', rotulo: 'Mês passado' },
  { id: '30d', rotulo: 'Últimos 30 dias' },
  { id: 'tudo', rotulo: 'Desde o início' },
] as const

function periodo(atalho: string, hoje: string, livre: { de: string; ate: string }) {
  if (atalho === 'custom') return livre
  const mesIni = hoje.slice(0, 8) + '01'
  const fimPass = somar(mesIni, -1)
  const mapa: Record<string, [string, string]> = {
    mes: [mesIni, hoje], mes_passado: [fimPass.slice(0, 8) + '01', fimPass], '30d': [somar(hoje, -29), hoje], tudo: [INICIO, hoje],
  }
  const [de, ate] = mapa[atalho] ?? mapa.mes
  return { de, ate }
}

function Tile({ titulo, valor, linha, cor }: { titulo: string; valor: string; linha?: React.ReactNode; cor?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 min-w-0">
      <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{titulo}</p>
      <p className={clsx('text-lg sm:text-2xl font-bold leading-tight tabular-nums break-words', cor ?? 'text-gray-900')}>{valor}</p>
      {linha && <p className="text-xs text-gray-500 mt-1">{linha}</p>}
    </div>
  )
}

function Painel({ titulo, children, icone }: { titulo: string; children: React.ReactNode; icone?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <h3 className="border-b border-gray-100 px-4 py-3 sm:px-5 text-sm font-semibold text-gray-800 flex items-center gap-2">{icone}{titulo}</h3>
      {children}
    </section>
  )
}

export default function OrigemVendas({ vendas, totais, hoje, custoAds, onAbrirDia }: {
  vendas: VendaIndividual[]
  totais: Venda[]
  hoje: string
  custoAds: Record<string, number> | null
  onAbrirDia: (data: string, vendedor: string | null) => void
}) {
  const [atalho, setAtalho] = useState<string>('mes')
  const [livre, setLivre] = useState({ de: hoje.slice(0, 8) + '01', ate: hoje })
  const [filtro, setFiltro] = useState<string>('todas')
  const p = useMemo(() => periodo(atalho, hoje, livre), [atalho, hoje, livre])

  const doPeriodo = useMemo(() => vendas.filter((v) => v.sale_date >= p.de && v.sale_date <= p.ate), [vendas, p])
  const fat = doPeriodo.reduce((s, v) => s + v.valor, 0)
  const qtd = doPeriodo.length
  const fatTotal = totais.filter((t) => t.sale_date >= p.de && t.sale_date <= p.ate).reduce((s, t) => s + t.total_amount, 0)
  const cobertura = fatTotal ? Math.min(fat / fatTotal, 1) : (fat ? 1 : 0)

  const porOrigem = ORIGENS.map((o) => {
    const v = doPeriodo.filter((x) => x.origem === o.id)
    const f = v.reduce((s, x) => s + x.valor, 0)
    return { ...o, qtd: v.length, fat: f, ticket: v.length ? f / v.length : 0, part: fat ? f / fat : 0 }
  }).sort((a, b) => b.fat - a.fat)
  const lider = porOrigem.find((o) => o.fat > 0)
  const maxFat = Math.max(...porOrigem.map((o) => o.fat), 1)

  const vendedores = Array.from(new Set(doPeriodo.map((v) => v.salesperson_name))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const origensUsadas = porOrigem.filter((o) => o.qtd > 0)

  // Google Ads: investimento x vendas
  const custo = custoAds ? Object.entries(custoAds).filter(([d]) => d >= p.de && d <= p.ate).reduce((s, [, c]) => s + c, 0) : 0
  const site = doPeriodo.filter((v) => v.origem === 'site_google')
  const fatSite = site.reduce((s, v) => s + v.valor, 0)
  const doAds = site.filter((v) => v.canal_site === 'google_ads')
  const fatAds = doAds.reduce((s, v) => s + v.valor, 0)
  const vinculadas = site.filter((v) => v.site_lead_id).length

  const lista = (filtro === 'todas' ? doPeriodo : doPeriodo.filter((v) => v.origem === filtro))
    .slice().sort((a, b) => b.sale_date.localeCompare(a.sale_date) || b.created_at.localeCompare(a.created_at))

  return (
    <div className="space-y-5">
      {/* Período */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {ATALHOS.map((a) => (
          <button key={a.id} onClick={() => setAtalho(a.id)} className={clsx('shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium', atalho === a.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{a.rotulo}</button>
        ))}
        <button onClick={() => setAtalho('custom')} className={clsx('shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium', atalho === 'custom' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>Escolher datas</button>
      </div>
      {atalho === 'custom' && (
        <div className="flex gap-2 items-center flex-wrap text-sm">
          <input type="date" value={livre.de} max={livre.ate} onChange={(e) => setLivre({ ...livre, de: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg" />
          <span className="text-gray-400">até</span>
          <input type="date" value={livre.ate} min={livre.de} max={hoje} onChange={(e) => setLivre({ ...livre, ate: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg" />
        </div>
      )}
      <p className="text-xs text-gray-500 -mt-2">{dm(p.de)}/{p.de.slice(0, 4)} a {dm(p.ate)}/{p.ate.slice(0, 4)}</p>

      {/* Cobertura */}
      {fatTotal > 0 && cobertura < 0.995 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{pct(cobertura * 100, 0)} do faturamento do período ({brl(fat)} de {brl(fatTotal)}) tem origem registrada. O restante foi lançado pelo total do dia, antes do registro venda a venda (começou em {dm(INICIO)}).</span>
        </p>
      )}

      {qtd === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-gray-700">Nenhuma venda registrada venda a venda neste período.</p>
          <p className="text-xs text-gray-500 mt-1">As vendas lançadas com origem aparecem aqui. O registro individual começou em {dm(INICIO)}/2026.</p>
        </div>
      ) : (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Tile titulo="Faturamento com origem" valor={brl(fat)} linha={`${num(qtd)} venda(s) registradas`} />
          <Tile titulo="Ticket médio" valor={brl(fat / qtd)} linha="Faturamento ÷ nº de vendas" />
          <Tile titulo="Origem que mais fatura" valor={lider?.rotulo ?? '—'} linha={lider ? `${brl(lider.fat)} · ${pct(lider.part * 100, 0)} do total` : undefined} />
          <Tile titulo="Canais digitais" valor={pct(porOrigem.filter((o) => ['site_google', 'instagram', 'facebook'].includes(o.id)).reduce((s, o) => s + o.part, 0) * 100, 0)} linha="Site/Google + Instagram + Facebook" />
        </div>

        {/* Por origem */}
        <Painel titulo="Faturamento por origem">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-medium">Origem</th>
                  <th className="text-right px-3 py-2.5 font-medium">Vendas</th>
                  <th className="text-right px-3 py-2.5 font-medium">Faturamento</th>
                  <th className="px-3 py-2.5 font-medium w-40 hidden sm:table-cell" />
                  <th className="text-right px-3 py-2.5 font-medium">% do total</th>
                  <th className="text-right px-4 py-2.5 font-medium">Ticket médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {porOrigem.map((o) => (
                  <tr key={o.id} className={clsx(!o.qtd && 'opacity-40')}>
                    <td className="px-4 py-2.5"><span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full border', o.cor)}>{o.rotulo}</span></td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{num(o.qtd)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900">{brl(o.fat)}</td>
                    <td className="px-3 py-2.5 hidden sm:table-cell"><div className="w-full bg-gray-100 rounded-full h-2"><div className={clsx('h-2 rounded-full', o.barra)} style={{ width: `${(o.fat / maxFat) * 100}%` }} /></div></td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">{pct(o.part * 100)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{o.qtd ? brl(o.ticket) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>

        {/* Google Ads */}
        {custoAds && (
          <Painel titulo="Google Ads — investimento x vendas" icone={<Megaphone className="w-4 h-4 text-indigo-500" />}>
            <div className="p-4 sm:p-5 space-y-3">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <Tile titulo="Investido no período" valor={brl(custo)} linha={custo ? undefined : 'Sem gasto registrado'} />
                <Tile titulo="Vendas Site / Google" valor={brl(fatSite)} linha={`${num(site.length)} venda(s) · ${num(vinculadas)} ligada(s) a orçamento`} />
                <Tile titulo="Confirmadas do Google Ads" valor={brl(fatAds)} linha={`${num(doAds.length)} venda(s) com orçamento vindo de anúncio`} />
                <Tile titulo="Retorno (ROAS)" valor={custo ? `${num(fatAds / custo, 1)}x` : '—'} cor={custo ? (fatAds >= custo ? 'text-emerald-600' : 'text-red-600') : undefined}
                  linha={custo ? `Confirmado · no máximo ${num(fatSite / custo, 1)}x se todo Site/Google veio do anúncio` : 'Aparece quando houver investimento'} />
              </div>
              <p className="text-xs text-gray-500">
                “Confirmadas” = vendas ligadas a um orçamento do site que chegou por anúncio. Vendas Site/Google sem orçamento vinculado (ex.: cliente que chamou direto no WhatsApp) entram só no retorno máximo.
                Para medir melhor, vincule o orçamento sempre que o cliente tiver vindo pelo formulário do site. Instagram e Facebook ganham o mesmo quadro quando o Meta Ads for conectado.
              </p>
            </div>
          </Painel>
        )}

        {/* Vendedor x origem */}
        {vendedores.length > 0 && (
          <Painel titulo="Vendedor(a) x origem — faturamento">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 font-medium">Vendedor(a)</th>
                    {origensUsadas.map((o) => <th key={o.id} className="text-right px-3 py-2.5 font-medium normal-case">{o.rotulo}</th>)}
                    <th className="text-right px-4 py-2.5 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vendedores.map((nome) => {
                    const dele = doPeriodo.filter((v) => v.salesperson_name === nome)
                    return (
                      <tr key={nome}>
                        <td className="px-4 py-2.5 font-semibold text-gray-800">{nome}</td>
                        {origensUsadas.map((o) => {
                          const x = dele.filter((v) => v.origem === o.id)
                          const f = x.reduce((s, v) => s + v.valor, 0)
                          return <td key={o.id} className="px-3 py-2.5 text-right tabular-nums text-gray-700">{x.length ? <>{brl(f)} <span className="text-xs text-gray-400">({x.length})</span></> : <span className="text-gray-200">—</span>}</td>
                        })}
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-900">{brl(dele.reduce((s, v) => s + v.valor, 0))} <span className="text-xs font-normal text-gray-400">({dele.length})</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Painel>
        )}

        {/* Lista */}
        <Painel titulo="Vendas registradas">
          <div className="flex gap-2 overflow-x-auto px-4 sm:px-5 pt-3 pb-1">
            {[{ id: 'todas', rotulo: 'Todas' }, ...origensUsadas].map((o) => (
              <button key={o.id} onClick={() => setFiltro(o.id)} className={clsx('shrink-0 px-3 py-1 rounded-lg text-xs font-semibold', filtro === o.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{o.rotulo}</button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-medium">Data</th>
                  <th className="text-left px-3 py-2.5 font-medium">Vendedor(a)</th>
                  <th className="text-left px-3 py-2.5 font-medium">Cliente</th>
                  <th className="text-left px-3 py-2.5 font-medium">Origem</th>
                  <th className="text-right px-4 py-2.5 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lista.slice(0, 300).map((v) => {
                  const o = infoOrigem(v.origem)
                  return (
                    <tr key={v.id} onClick={() => onAbrirDia(v.sale_date, v.salesperson_name)} className="cursor-pointer hover:bg-indigo-50/50">
                      <td className="px-4 py-2 tabular-nums text-gray-700">{dm(v.sale_date)}</td>
                      <td className="px-3 py-2 text-gray-700">{v.salesperson_name}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[14rem] truncate">{v.cliente || <span className="text-gray-300">—</span>}{v.pedido && <span className="text-xs text-gray-400"> · {v.pedido}</span>}</td>
                      <td className="px-3 py-2">
                        <span className={clsx('text-[11px] font-semibold px-2 py-0.5 rounded-full border', o.cor)}>{o.rotulo}</span>
                        {v.canal_site && <span className="ml-1.5 text-[11px] text-gray-500">{CANAL_ROTULO[v.canal_site] ?? v.canal_site}</span>}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold text-gray-900">{brl(v.valor)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Painel>
      </>)}
    </div>
  )
}
