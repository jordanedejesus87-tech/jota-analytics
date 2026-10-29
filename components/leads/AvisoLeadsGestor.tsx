import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

/** Faixa silenciosa para a gestão (dono/administrador): avisa quando há leads do site sem resposta. Sem som, sem janela. */
export default async function AvisoLeadsGestor({ companyId }: { companyId: string }) {
  const supabase = createClient()
  const { data, count } = await supabase.from('site_leads').select('created_at', { count: 'exact' })
    .eq('company_id', companyId).eq('status', 'novo').order('created_at', { ascending: true }).limit(1)
  if (!count) return null
  const desde = data?.[0]?.created_at
    ? new Date(data[0].created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null
  return (
    <Link href="/dashboard/leads" className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 sm:px-6 lg:px-8 py-2 text-sm text-amber-900 hover:bg-amber-100">
      <span><b>{count} lead(s) do site sem resposta</b>{desde ? ` · o mais antigo chegou em ${desde}` : ''}</span>
      <span className="font-semibold">Ver leads →</span>
    </Link>
  )
}
