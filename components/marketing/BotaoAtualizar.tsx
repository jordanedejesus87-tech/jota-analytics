'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/** Busca agora os números do Meta Ads (a sincronização automática roda de madrugada). */
export default function BotaoAtualizar() {
  const router = useRouter()
  const [rodando, setRodando] = useState(false)
  const [msg, setMsg] = useState('')

  async function atualizar() {
    setRodando(true); setMsg('')
    const { data, error } = await createClient().functions.invoke('midia-sync', { body: {} })
    setRodando(false)
    const falha = error?.message || (data?.contas as { erro?: string }[] | undefined)?.find((c) => c.erro)?.erro
    if (falha) setMsg('Não foi possível atualizar: ' + falha)
    else if (!data?.contas?.length) setMsg('Nenhuma conta de anúncios conectada para esta empresa.')
    else { setMsg('Atualizado.'); router.refresh() }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={atualizar} disabled={rodando}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
        <RefreshCw className={rodando ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} /> {rodando ? 'Atualizando…' : 'Atualizar agora'}
      </button>
      {msg && <span role="status" className="text-xs text-gray-600">{msg}</span>}
    </span>
  )
}
