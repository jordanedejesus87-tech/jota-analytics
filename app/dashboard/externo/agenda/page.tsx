import AgendaView from '@/components/externo/AgendaView'
import { sessaoExterno, vendedoresExternos } from '@/lib/externo/sessao'
import { hojeSP, agenda, type VisitaExt } from '@/lib/externo/metricas'

export const dynamic = 'force-dynamic'

export default async function Agenda({ searchParams }: { searchParams: { v?: string; salvo?: string } }) {
  const { supabase, user, profile, gestor, podeEditar } = await sessaoExterno()
  const vendedores = gestor ? await vendedoresExternos(supabase, profile.company_id) : []
  const vendedorId = gestor ? searchParams.v || vendedores[0]?.id : user.id
  const { data } = vendedorId
    ? await supabase.from('vw_ext_visitas').select('*').eq('vendedor_id', vendedorId).order('data_visita').limit(5000)
    : { data: [] }
  const hoje = hojeSP()
  return (
    <AgendaView
      agenda={agenda((data ?? []) as VisitaExt[], hoje)}
      hoje={hoje}
      podeEditar={podeEditar}
      vendedores={vendedores}
      vendedorId={vendedorId}
      salvo={!!searchParams.salvo}
    />
  )
}
