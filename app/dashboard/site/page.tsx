import { redirect } from 'next/navigation'

// O antigo menu "Site e Google Ads" agora é uma aba do módulo Marketing.
// Links antigos (favoritos, mensagens) continuam funcionando e caem direto na aba.
export default function SitePage({ searchParams }: { searchParams: { p?: string; de?: string; ate?: string } }) {
  const q = new URLSearchParams({ aba: 'google' })
  for (const k of ['p', 'de', 'ate'] as const) if (searchParams[k]) q.set(k, searchParams[k]!)
  redirect(`/dashboard/marketing?${q.toString()}`)
}
