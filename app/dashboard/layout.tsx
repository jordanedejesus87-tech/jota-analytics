import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarWrapper from '@/components/SidebarWrapper'
import AlertaLeads from '@/components/leads/AlertaLeads'

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
  const recebeLeads = Boolean(resp?.length) && Boolean(profile.company_id)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <SidebarWrapper profile={profile} />
      {recebeLeads && <AlertaLeads companyId={profile.company_id} />}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
