import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarWrapper from '@/components/SidebarWrapper'
import AlertaLeads from '@/components/leads/AlertaLeads'
import AvisoLeadsGestor from '@/components/leads/AvisoLeadsGestor'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, company:companies(*)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Quem recebe os leads do site (ex.: Bruna) ganha a janela de alerta com som em qualquer tela do sistema
  const { data: resp } = await supabase.from('lead_responsaveis').select('user_id').eq('user_id', user.id).limit(1)
  // Alerta com som só para quem atende (perfil comercial cadastrado como responsável, hoje a Bruna)
  const recebeLeads = Boolean(resp?.length) && Boolean(profile.company_id) && profile.role === 'commercial'
  // Gestão (dono e administrador): só uma faixa discreta, sem som, quando há leads sem resposta
  const gestor = ['admin', 'system', 'client'].includes(profile.role) && Boolean(profile.company_id)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <SidebarWrapper profile={profile} />
      {recebeLeads && <AlertaLeads companyId={profile.company_id} verTempos={['admin', 'system', 'client'].includes(profile.role)} />}
      <main className="flex-1 overflow-y-auto">
        {gestor && <AvisoLeadsGestor companyId={profile.company_id} />}
        {children}
      </main>
    </div>
  )
}
