import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const PAPEIS_MODULO = ['admin', 'system', 'client', 'externo']

export async function sessaoExterno() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('id, name, role, company_id').eq('id', user.id).single()
  if (!profile || !PAPEIS_MODULO.includes(profile.role)) redirect('/dashboard')
  const gestor = ['admin', 'system', 'client'].includes(profile.role)
  return { supabase, user, profile, gestor, podeEditar: profile.role !== 'client' }
}

export async function vendedoresExternos(supabase: ReturnType<typeof createClient>, companyId: string) {
  const { data } = await supabase.from('profiles').select('id, name').eq('company_id', companyId).eq('role', 'externo').order('name')
  return data ?? []
}

export const SEM_ROTA = 'Sem rota'
export const ordenarRotas = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { numeric: true })

/** Rotas cadastradas (tabela ext_rotas) + qualquer rota antiga que ainda esteja só nas empresas. */
export async function rotasDaEmpresa(supabase: ReturnType<typeof createClient>, companyId: string) {
  const [{ data: rotas }, { data: emp }] = await Promise.all([
    supabase.from('ext_rotas').select('nome').eq('company_id', companyId),
    supabase.from('ext_empresas').select('rota').eq('company_id', companyId).limit(5000),
  ])
  const nomes = new Set<string>([...(rotas ?? []).map((r) => r.nome), ...(emp ?? []).map((r) => r.rota)])
  nomes.delete(SEM_ROTA)
  return Array.from(nomes).filter(Boolean).sort(ordenarRotas)
}
