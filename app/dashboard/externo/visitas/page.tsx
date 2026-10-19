import VisitasView from '@/components/externo/VisitasView'
import { sessaoExterno } from '@/lib/externo/sessao'
import { hojeSP, resolverPeriodo, type VisitaExt } from '@/lib/externo/metricas'

export const dynamic = 'force-dynamic'

export default async function Visitas({ searchParams }: { searchParams: { p?: string; de?: string; ate?: string; salvo?: string; apagado?: string } }) {
  const { supabase, profile, gestor } = await sessaoExterno()
  const periodo = resolverPeriodo(searchParams, hojeSP())
  const { data } = await supabase
    .from('vw_ext_visitas').select('*')
    .eq('company_id', profile.company_id)
    .gte('data_visita', periodo.de).lte('data_visita', periodo.ate)
    .order('data_visita', { ascending: false }).order('hora_chegada', { ascending: false })
    .limit(2000)
  return <VisitasView visitas={(data ?? []) as VisitaExt[]} periodo={periodo} gestor={gestor} salvo={!!searchParams.salvo} apagado={!!searchParams.apagado} />
}
