import VisitasView from '@/components/externo/VisitasView'
import { sessaoExterno } from '@/lib/externo/sessao'
import { hojeSP, resolverPeriodo, type VisitaExt } from '@/lib/externo/metricas'

export const dynamic = 'force-dynamic'

export default async function Visitas({ searchParams }: { searchParams: { p?: string; de?: string; ate?: string; salvo?: string; apagado?: string; tipo?: string } }) {
  const { supabase, profile, gestor } = await sessaoExterno()
  const periodo = resolverPeriodo(searchParams, hojeSP())
  const { data } = await supabase
    .from('vw_ext_visitas').select('*')
    .eq('company_id', profile.company_id)
    .gte('data_visita', periodo.de).lte('data_visita', periodo.ate)
    .order('data_visita', { ascending: false }).order('hora_chegada', { ascending: true, nullsFirst: true })
    .limit(2000)
  // Número da visita a cada empresa (1ª, 2ª, 3ª…), contando todo o histórico.
  const { data: todas } = await supabase.from('ext_visitas').select('id, empresa_id, data_visita, hora_chegada')
    .eq('company_id', profile.company_id).order('data_visita').order('hora_chegada', { nullsFirst: true }).order('id').limit(20000)
  const contador = new Map<number, number>()
  const ordem: Record<number, number> = {}
  for (const v of todas ?? []) {
    const n = (contador.get(v.empresa_id) ?? 0) + 1
    contador.set(v.empresa_id, n)
    ordem[v.id] = n
  }
  return <VisitasView visitas={(data ?? []) as VisitaExt[]} ordem={ordem} periodo={periodo} gestor={gestor} filtro={searchParams.tipo} salvo={!!searchParams.salvo} apagado={!!searchParams.apagado} />
}
