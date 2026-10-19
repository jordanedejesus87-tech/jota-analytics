import Link from 'next/link'
import { clsx } from 'clsx'
import { sessaoExterno, vendedoresExternos } from '@/lib/externo/sessao'
import {
  METAS, porSemana, oportunidades, retornosAgendados, hojeSP, segundaDe, somarDias, dm, rotuloSemana,
  semanaVazia, brl, pct, num, type VisitaExt,
} from '@/lib/externo/metricas'

export const dynamic = 'force-dynamic'

function Tile({ titulo, valor, linha1, linha2, ok }: { titulo: string; valor: string; linha1?: string | null; linha2?: string; ok?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{titulo}</p>
      <p className="text-2xl font-bold leading-tight text-gray-900 tabular-nums">{valor}</p>
      {linha1 && <p className="text-xs text-gray-500 mt-1">{linha1}</p>}
      {linha2 && (
        <p className={clsx('text-xs mt-0.5', ok === undefined ? 'text-gray-400' : ok ? 'text-emerald-600' : 'text-red-600')}>{linha2}</p>
      )}
    </div>
  )
}

const delta = (v: number, f: (x: number) => string) => (v === 0 ? 'igual à semana anterior' : `${v > 0 ? '+' : '−'}${f(Math.abs(v))} vs. semana anterior`)

export default async function PainelExterno({ searchParams }: { searchParams: { v?: string; s?: string } }) {
  const { supabase, user, profile, gestor } = await sessaoExterno()

  const vendedores = gestor ? await vendedoresExternos(supabase, profile.company_id) : []
  const vendedorId = gestor ? searchParams.v || vendedores[0]?.id : user.id
  const nomeVendedor = gestor ? vendedores.find((v) => v.id === vendedorId)?.name : profile.name

  const { data, error } = vendedorId
    ? await supabase.from('vw_ext_visitas').select('*').eq('vendedor_id', vendedorId).order('data_visita').limit(5000)
    : { data: [], error: null }
  const visitas = (data ?? []) as VisitaExt[]

  const hoje = hojeSP()
  const atual = segundaDe(hoje)
  const semanas = porSemana(visitas)
  const sel = searchParams.s || atual
  const s = semanas.find((x) => x.semana === sel) ?? semanaVazia(sel)
  const ant = semanas.find((x) => x.semana === somarDias(sel, -7))
  const ops = oportunidades(visitas).slice(0, 12)
  const retornos = retornosAgendados(visitas).slice(0, 12)
  const ultimas = semanas.slice(-8)
  const maxFat = Math.max(1, ...ultimas.map((x) => x.faturamento))
  const opcoes = Array.from(new Set([atual, ...semanas.map((x) => x.semana)])).sort().reverse().slice(0, 8)
  const deHoje = visitas.filter((v) => v.data_visita === hoje).length
  const q = (extra: Record<string, string>) => '?' + new URLSearchParams({ ...(gestor && vendedorId ? { v: vendedorId } : {}), ...extra }).toString()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{gestor ? `Painel de ${nomeVendedor ?? 'vendedor'}` : `Olá, ${(profile.name || '').split(' ')[0]}`}</h2>
          <p className="text-sm text-gray-500">Semana de {s.rotulo}{sel === atual ? ' (em andamento)' : ''} · {deHoje} visita(s) registrada(s) hoje</p>
        </div>
        {!gestor && (
          <Link href="/dashboard/externo/ficha/nova" className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">+ Nova ficha</Link>
        )}
      </div>

      {gestor && vendedores.length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Nenhum vendedor externo cadastrado nesta empresa ainda.</p>
      )}
      {gestor && vendedores.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {vendedores.map((v) => (
            <Link key={v.id} href={'?' + new URLSearchParams({ v: v.id, s: sel })} className={clsx('rounded-full border px-3 py-1 text-sm', v.id === vendedorId ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700')}>{v.name}</Link>
          ))}
        </div>
      )}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não foi possível carregar as visitas: {error.message}</p>}

      <div className="flex flex-wrap gap-2" aria-label="Semana">
        {opcoes.map((k) => (
          <Link key={k} href={q({ s: k })} aria-current={k === sel ? 'true' : undefined} className={clsx('rounded-full border px-3 py-1 text-sm', k === sel ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700')}>
            {k === atual ? 'Esta semana' : rotuloSemana(k)}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Tile titulo="Faturamento vendido" valor={brl(s.faturamento)} linha1={ant ? delta(s.faturamento - ant.faturamento, brl) : null} linha2={s.vendas ? `${s.vendas} venda(s) · ${num(s.pecas)} peças` : 'Sem vendas na semana'} />
        <Tile titulo="Clientes novos" valor={num(s.clientesNovos)} linha1={ant ? delta(s.clientesNovos - ant.clientesNovos, (x) => num(x)) : null} linha2={`Meta: ${METAS.clientesNovos} ou mais`} ok={s.clientesNovos >= METAS.clientesNovos} />
        <Tile titulo="Visitas" valor={num(s.visitas)} linha1={ant ? delta(s.visitas - ant.visitas, (x) => num(x)) : null} linha2={`Meta: 35 a 40 · ${num(s.visitasDia, 1)}/dia`} ok={s.visitas >= METAS.visitas} />
        <Tile titulo="Com próximo passo" valor={pct(s.pctProximoPasso)} linha2="Meta: 70% ou mais" ok={s.visitas ? s.pctProximoPasso >= METAS.pctProximoPasso : undefined} />
        <Tile titulo="Só material entregue" valor={pct(s.pctSoMaterial)} linha2="Meta: até 20%" ok={s.visitas ? s.pctSoMaterial <= METAS.pctSoMaterial : undefined} />
        <Tile titulo="Peças em negociação" valor={num(s.expectativa)} linha2="Expectativa somada das visitas da semana" />
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h3 className="font-semibold text-gray-900">Faturamento por semana</h3>
        {ultimas.length === 0 ? (
          <p className="text-sm text-gray-500">Assim que as primeiras fichas forem salvas, a evolução aparece aqui.</p>
        ) : (
          <div className="space-y-2">
            {ultimas.map((x) => (
              <div key={x.semana} className="grid grid-cols-[6.5rem_1fr_6rem] items-center gap-2 text-sm tabular-nums">
                <span className="text-gray-600">{x.rotulo}</span>
                <span className="h-3 rounded-full bg-indigo-50 overflow-hidden"><span className={clsx('block h-full rounded-full', x.semana === sel ? 'bg-indigo-600' : 'bg-indigo-300')} style={{ width: `${(x.faturamento / maxFat) * 100}%` }} /></span>
                <span className="text-right text-gray-700">{brl(x.faturamento)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Retornos agendados</h3>
          {retornos.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum retorno marcado. Preencha o Agendamento na ficha para ele aparecer aqui.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {retornos.map((v) => (
                <li key={v.id} className="py-2">
                  <Link href={`/dashboard/externo/ficha/nova?empresa=${v.empresa_id}`} className="block hover:bg-gray-50 -mx-2 px-2 rounded">
                    <span className="font-medium text-gray-900">{v.cliente}</span> <span className="text-sm text-indigo-700">· {v.agendamento}</span>
                    <span className="block text-xs text-gray-500">{v.obs || 'Sem anotação'} · visitada em {dm(v.data_visita)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Maiores oportunidades abertas</h3>
          {ops.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma oportunidade aberta.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {ops.map((v) => (
                <li key={v.id} className="py-2 flex items-start justify-between gap-3">
                  <Link href={`/dashboard/externo/ficha/nova?empresa=${v.empresa_id}`} className="min-w-0">
                    <span className="font-medium text-gray-900">{v.cliente}</span>
                    <span className="block text-xs text-gray-500 truncate">{v.obs || 'Sem anotação'} · {dm(v.data_visita)}</span>
                  </Link>
                  <span className="text-right shrink-0">
                    <span className={clsx('inline-block rounded-full px-2 text-xs font-semibold', v.possibilidade === 'Alta' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{v.possibilidade}</span>
                    <span className="block text-sm tabular-nums text-gray-700">{num(v.expectativa_pecas)} peças</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
