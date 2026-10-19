import Link from 'next/link'
import { redirect } from 'next/navigation'
import FichaForm from '@/components/externo/FichaForm'
import { sessaoExterno, rotasDaEmpresa, vendedoresExternos } from '@/lib/externo/sessao'
import { hojeSP, agoraSP, dm } from '@/lib/externo/metricas'

export const dynamic = 'force-dynamic'

export default async function NovaFicha({ searchParams }: { searchParams: { empresa?: string } }) {
  const { supabase, profile, podeEditar } = await sessaoExterno()
  if (!podeEditar) redirect('/dashboard/externo')

  let empresa: Record<string, any> = {}
  let anterior: Record<string, any> | null = null
  if (searchParams.empresa) {
    const { data } = await supabase.from('ext_empresas').select('*').eq('id', searchParams.empresa).single()
    empresa = data ?? {}
    const { data: ult } = await supabase.from('ext_visitas').select('*').eq('empresa_id', searchParams.empresa).order('data_visita', { ascending: false }).limit(1)
    anterior = ult?.[0] ?? null
  }
  const rotas = await rotasDaEmpresa(supabase, profile.company_id)
  const vendedores = profile.role === 'externo' ? [] : await vendedoresExternos(supabase, profile.company_id)
  // Retorno a uma empresa já visitada: o perfil do cliente vem da última ficha.
  const base = anterior
    ? { n_funcionarios: anterior.n_funcionarios, ja_compra_uniforme: anterior.ja_compra_uniforme, ja_comprou_laesc: anterior.ja_comprou_laesc, expectativa_pecas: anterior.expectativa_pecas, possibilidade: anterior.possibilidade }
    : {}

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{empresa.id ? `Nova ficha · ${empresa.nome}` : 'Nova ficha de atendimento'}</h2>
        {!empresa.id && <Link href="/dashboard/externo/empresas" className="text-sm font-semibold text-indigo-700 underline">Escolher empresa da lista</Link>}
      </div>
      {anterior && (
        <p className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          Última visita em {dm(anterior.data_visita)}: {anterior.obs || 'sem anotação'}{anterior.agendamento ? ` · retorno: ${anterior.agendamento}` : ''}. O perfil do cliente já veio preenchido; confira.
        </p>
      )}
      {!empresa.id && <p className="text-sm text-gray-500">Empresa nova: preencha os dados abaixo. Se ela já está numa rota, escolha da lista para não duplicar.</p>}
      <FichaForm empresa={empresa} visita={base} rotas={rotas} hoje={hojeSP()} vendedores={vendedores} agoraInicial={agoraSP()} />
    </div>
  )
}
