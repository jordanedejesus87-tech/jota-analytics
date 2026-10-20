import PainelView from '@/components/externo/PainelView'
import ResultadosView from '@/components/externo/ResultadosView'
import { sessaoExterno, vendedoresExternos } from '@/lib/externo/sessao'
import { hojeSP, resolverPeriodo, type VisitaExt } from '@/lib/externo/metricas'

export const dynamic = 'force-dynamic'

export default async function PainelExterno({ searchParams }: { searchParams: { v?: string; p?: string; de?: string; ate?: string } }) {
  const { supabase, user, profile, gestor } = await sessaoExterno()
  const vendedores = gestor ? await vendedoresExternos(supabase, profile.company_id) : []
  const vendedorId = gestor ? searchParams.v || vendedores[0]?.id : user.id
  const nome = gestor ? vendedores.find((v) => v.id === vendedorId)?.name : profile.name

  const { data, error } = vendedorId
    ? await supabase.from('vw_ext_visitas').select('*').eq('vendedor_id', vendedorId).order('data_visita').limit(5000)
    : { data: [], error: null }

  const hoje = hojeSP()
  if (gestor) {
    return <ResultadosView visitas={(data ?? []) as VisitaExt[]} periodo={resolverPeriodo(searchParams, hoje)} hoje={hoje} vendedores={vendedores} vendedorId={vendedorId} nome={nome} />
  }
  return (
    <PainelView
      visitas={(data ?? []) as VisitaExt[]}
      periodo={resolverPeriodo(searchParams, hoje)}
      hoje={hoje}
      gestor={gestor}
      vendedores={vendedores}
      vendedorId={vendedorId}
      titulo={gestor ? `Painel de ${nome ?? 'vendedor'}` : `Olá, ${(profile.name || '').split(' ')[0]}`}
      erro={error?.message}
    />
  )
}
