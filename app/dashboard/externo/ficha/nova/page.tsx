import Link from 'next/link'
import { redirect } from 'next/navigation'
import { clsx } from 'clsx'
import FichaForm, { type VisitaHistorico } from '@/components/externo/FichaForm'
import EscolherEmpresa, { type EmpresaEscolha } from '@/components/externo/EscolherEmpresa'
import { sessaoExterno, rotasDaEmpresa, vendedoresExternos } from '@/lib/externo/sessao'
import { hojeSP, agoraSP, dm, dataRetorno } from '@/lib/externo/metricas'

export const dynamic = 'force-dynamic'

const CAMPOS_HIST = 'id, data_visita, hora_chegada, tipo, objetivo, obs, proximo_passo, agendamento, retorno_data, expectativa_pecas, possibilidade, pecas_vendidas, faturamento, n_funcionarios, ja_compra_uniforme, ja_comprou_laesc'

export default async function NovaVisita({ searchParams }: { searchParams: { empresa?: string; tipo?: string } }) {
  const { supabase, profile, podeEditar } = await sessaoExterno()
  if (!podeEditar) redirect('/dashboard/externo')
  const hoje = hojeSP()

  let empresa: Record<string, any> = {}
  let historico: (VisitaHistorico & Record<string, any>)[] = []
  if (searchParams.empresa) {
    const [{ data }, { data: hist }] = await Promise.all([
      supabase.from('ext_empresas').select('*').eq('id', searchParams.empresa).single(),
      supabase.from('ext_visitas').select(CAMPOS_HIST).eq('empresa_id', searchParams.empresa).order('data_visita', { ascending: false }).order('hora_chegada', { ascending: false, nullsFirst: false }).limit(20),
    ])
    empresa = data ?? {}
    historico = (hist ?? []) as any
  }
  const jaVisitada = historico.length > 0
  const tipo: 'primeira' | 'followup' = searchParams.tipo === 'followup' || searchParams.tipo === 'primeira' ? searchParams.tipo : jaVisitada ? 'followup' : 'primeira'
  const ultima = historico[0]

  const opcao = (t: 'primeira' | 'followup', titulo: string, sub: string) => {
    const ativo = tipo === t
    const href = `/dashboard/externo/ficha/nova?tipo=${t}${empresa.id && (t === 'followup' ? jaVisitada : true) ? `&empresa=${empresa.id}` : ''}`
    return (
      <Link href={href} aria-current={ativo ? 'page' : undefined} className={clsx('flex-1 rounded-xl border-2 px-4 py-3 text-left', ativo ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300')}>
        <span className="flex items-center gap-2">
          <span className={clsx('h-4 w-4 rounded-full border-2', ativo ? 'border-indigo-600 bg-indigo-600 ring-2 ring-inset ring-white' : 'border-gray-300')} />
          <span className={clsx('font-semibold', ativo ? 'text-indigo-800' : 'text-gray-800')}>{titulo}</span>
        </span>
        <span className="block text-xs text-gray-500 mt-0.5 pl-6">{sub}</span>
      </Link>
    )
  }

  const seletor = (
    <div className="flex flex-col sm:flex-row gap-2" role="radiogroup" aria-label="Tipo de visita">
      {opcao('primeira', 'Primeira visita', 'Empresa nova: cadastro + visita')}
      {opcao('followup', 'Follow-up · retorno', 'Empresa já visitada: só o retorno')}
    </div>
  )

  // Follow-up sem empresa escolhida: lista das empresas já visitadas.
  if (tipo === 'followup' && !empresa.id) {
    const { data: vis } = await supabase.from('ext_visitas').select('empresa_id, data_visita, hora_chegada, retorno_data, agendamento, empresa:ext_empresas(id, nome, rota, bairro)')
      .eq('company_id', profile.company_id).order('data_visita').order('hora_chegada', { nullsFirst: true }).limit(10000)
    const mapa = new Map<number, EmpresaEscolha>()
    for (const v of (vis ?? []) as any[]) {
      if (!v.empresa) continue
      mapa.set(v.empresa_id, { id: v.empresa.id, nome: v.empresa.nome, rota: v.empresa.rota, bairro: v.empresa.bairro, ultima: v.data_visita, retorno: dataRetorno(v) })
    }
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Nova visita</h2>
        {seletor}
        <p className="text-sm text-gray-600">Escolha a empresa do retorno. As que têm retorno marcado aparecem primeiro.</p>
        <EscolherEmpresa empresas={Array.from(mapa.values())} hoje={hoje} />
      </div>
    )
  }

  const rotas = await rotasDaEmpresa(supabase, profile.company_id)
  const vendedores = profile.role === 'externo' ? [] : await vendedoresExternos(supabase, profile.company_id)
  // A oportunidade da última visita já vem preenchida para ser atualizada.
  const base = ultima ? { expectativa_pecas: ultima.expectativa_pecas, possibilidade: ultima.possibilidade, ...(tipo === 'primeira' ? { n_funcionarios: ultima.n_funcionarios, ja_compra_uniforme: ultima.ja_compra_uniforme, ja_comprou_laesc: ultima.ja_comprou_laesc } : {}) } : {}

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{empresa.id ? `Nova visita · ${empresa.nome}` : 'Nova visita'}</h2>
      {seletor}
      {tipo === 'primeira' && jaVisitada && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {empresa.nome} já foi visitada em {dm(ultima.data_visita)}. Se é um retorno, use <Link className="font-semibold underline" href={`/dashboard/externo/ficha/nova?tipo=followup&empresa=${empresa.id}`}>Follow-up</Link> — não precisa preencher o cadastro de novo.
        </p>
      )}
      {tipo === 'primeira' && !empresa.id && (
        <p className="text-sm text-gray-500">Empresa nova: faça o cadastro e registre a visita. Se a empresa já está numa rota, <Link href="/dashboard/externo/empresas" className="font-semibold text-indigo-700 underline">escolha da lista</Link> para não duplicar.</p>
      )}
      <FichaForm tipo={tipo} empresa={empresa} visita={base} historico={historico} rotas={rotas} hoje={hoje} vendedores={vendedores} agoraInicial={agoraSP()} />
    </div>
  )
}
