import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DFCDashboard from '@/components/DFCDashboard'
import type { DFCData } from '@/lib/types'

// DFC estático LAESC 2026 — substituído por upload via admin quando disponível
const LAESC_DFC_2026: DFCData = {
  year: 2026,
  period_label: 'Jan–Set/26 Realizado | Out–Dez/26 Projetado',
  realizados: ['jan','fev','mar','abr','mai','jun','jul','ago','set'],
  rv: {
    jan:{meta:78475,real:73779},fev:{meta:78475,real:64598},mar:{meta:78475,real:96578},
    abr:{meta:78475,real:90528},mai:{meta:78475,real:92802},jun:{meta:78475,real:101507},
    jul:{meta:78475,real:122015},ago:{meta:78475,real:115088},set:{meta:78475,real:108168},
    out:{meta:120000,real:null},nov:{meta:120000,real:null},dez:{meta:120000,real:null},
  } as any,
  pvar: {
    jan:{meta:26241,real:23821},fev:{meta:26241,real:25267},mar:{meta:26241,real:43603},
    abr:{meta:26241,real:35344},mai:{meta:26241,real:50776},jun:{meta:26241,real:51534},
    jul:{meta:26241,real:57099},ago:{meta:26241,real:51009},set:{meta:26241,real:33287},
    out:{meta:40151,real:null},nov:{meta:40151,real:null},dez:{meta:40151,real:null},
  } as any,
  pfx: {
    jan:{meta:17756,real:17757},fev:{meta:17756,real:30064},mar:{meta:17756,real:25048},
    abr:{meta:17756,real:25288},mai:{meta:17756,real:22137},jun:{meta:17756,real:19957},
    jul:{meta:17756,real:21303},ago:{meta:17756,real:26838},set:{meta:17756,real:28897},
    out:{meta:17756,real:null},nov:{meta:17756,real:null},dez:{meta:17756,real:null},
  } as any,
  mc: {
    jan:{meta:52234,real:49958},fev:{meta:52234,real:39331},mar:{meta:52234,real:52975},
    abr:{meta:52234,real:55184},mai:{meta:52234,real:42026},jun:{meta:52234,real:49973},
    jul:{meta:52234,real:64916},ago:{meta:52234,real:64079},set:{meta:52234,real:74881},
    out:{meta:79849,real:null},nov:{meta:79849,real:null},dez:{meta:79849,real:null},
  } as any,
  roai: {
    jan:{meta:34478,real:32201},fev:{meta:34478,real:9267},mar:{meta:34478,real:27927},
    abr:{meta:34478,real:29896},mai:{meta:34478,real:19889},jun:{meta:34478,real:30016},
    jul:{meta:34478,real:43613},ago:{meta:34478,real:37241},set:{meta:34478,real:45984},
    out:{meta:62093,real:null},nov:{meta:62093,real:null},dez:{meta:62093,real:null},
  } as any,
  ro: {
    jan:{meta:34478,real:32201},fev:{meta:34478,real:9267},mar:{meta:34478,real:27927},
    abr:{meta:34478,real:29896},mai:{meta:34478,real:19889},jun:{meta:34478,real:30016},
    jul:{meta:34478,real:43613},ago:{meta:34478,real:1719},set:{meta:34478,real:45984},
    out:{meta:62093,real:null},nov:{meta:62093,real:null},dez:{meta:62093,real:null},
  } as any,
  gc: {
    jan:{meta:22225,real:7161},fev:{meta:22225,real:6121},mar:{meta:22225,real:-6726},
    abr:{meta:22225,real:1828},mai:{meta:22225,real:-4289},jun:{meta:22225,real:-4484},
    jul:{meta:22225,real:8067},ago:{meta:22225,real:-494},set:{meta:22225,real:5929},
    out:{meta:22225,real:null},nov:{meta:22225,real:null},dez:{meta:22225,real:null},
  } as any,
  saldo_ini: {
    jan:8465,fev:15625,mar:21746,abr:15021,mai:16849,jun:12560,
    jul:8075,ago:16142,set:15648,out:21577,nov:47492,dez:73407,
  } as any,
  saldo_fin: {
    jan:15625,fev:21746,mar:15021,abr:16849,mai:12560,jun:8075,
    jul:16142,ago:15648,set:21577,out:47492,nov:73407,dez:99322,
  } as any,
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  // Tentar buscar snapshot do banco; usar estático como fallback
  let dfcData: DFCData = LAESC_DFC_2026

  if (profile?.company_id) {
    const { data: snapshot } = await supabase
      .from('dfc_snapshots')
      .select('data')
      .eq('company_id', profile.company_id)
      .eq('year', 2026)
      .single()

    if (snapshot?.data) {
      dfcData = snapshot.data as DFCData
    }
  }

  return <DFCDashboard data={dfcData} />
}
