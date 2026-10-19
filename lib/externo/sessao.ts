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

export async function rotasDaEmpresa(supabase: ReturnType<typeof createClient>, companyId: string) {
  const { data } = await supabase.from('ext_empresas').select('rota').eq('company_id', companyId).limit(5000)
  return Array.from(new Set((data ?? []).map((r) => r.rota).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
}
