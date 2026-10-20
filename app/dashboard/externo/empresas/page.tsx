import Link from 'next/link'
import ListaEmpresas, { type EmpresaLista } from '@/components/externo/ListaEmpresas'
import { sessaoExterno, rotasDaEmpresa, SEM_ROTA } from '@/lib/externo/sessao'
import { classificar } from '@/lib/externo/metricas'

export const dynamic = 'force-dynamic'

export default async function Empresas({ searchParams }: { searchParams: { rota?: string } }) {
  const { supabase, profile, podeEditar } = await sessaoExterno()
  const [{ data: empresas }, { data: visitas }] = await Promise.all([
    supabase.from('ext_empresas').select('id, rota, nome, endereco, bairro, telefone, contato').eq('company_id', profile.company_id).eq('ativo', true).order('rota').order('nome').limit(5000),
    supabase.from('ext_visitas').select('empresa_id, data_visita, agendamento, obs, possibilidade, pecas_vendidas, faturamento, ja_comprou_laesc').eq('company_id', profile.company_id).order('data_visita').limit(10000),
  ])
  const ultima = new Map<number, EmpresaLista['ultima']>()
  for (const v of visitas ?? []) {
    ultima.set(v.empresa_id, { ...v, vendeu: classificar(v).vendeu || Boolean(ultima.get(v.empresa_id)?.vendeu) })
  }
  const lista: EmpresaLista[] = (empresas ?? []).map((e) => ({ ...e, ultima: ultima.get(e.id) ?? null }))
  const rotas = await rotasDaEmpresa(supabase, profile.company_id)
  if (lista.some((e) => e.rota === SEM_ROTA)) rotas.push(SEM_ROTA)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Empresas por rota</h2>
        <div className="flex gap-4">
          <Link href="/dashboard/externo/rotas" className="text-sm font-semibold text-indigo-700 underline">{podeEditar ? 'Gerenciar rotas' : 'Ver rotas'}</Link>
          {podeEditar && <Link href="/dashboard/externo/ficha/nova" className="text-sm font-semibold text-indigo-700 underline">+ Empresa nova</Link>}
        </div>
      </div>
      <ListaEmpresas empresas={lista} rotas={rotas} podeEditar={podeEditar} rotaInicial={searchParams.rota} />
    </div>
  )
}
