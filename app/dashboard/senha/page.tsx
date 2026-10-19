'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const campo = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function TrocarSenha() {
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const senha = String(f.get('senha') || '')
    const confirma = String(f.get('confirma') || '')
    if (senha.length < 8) return setMsg({ ok: false, texto: 'A senha precisa ter pelo menos 8 caracteres.' })
    if (senha !== confirma) return setMsg({ ok: false, texto: 'As duas senhas não são iguais. Digite de novo.' })
    setEnviando(true)
    const { error } = await createClient().auth.updateUser({ password: senha })
    setEnviando(false)
    if (error) return setMsg({ ok: false, texto: 'Não foi possível trocar a senha: ' + error.message })
    e.currentTarget.reset()
    setMsg({ ok: true, texto: 'Senha trocada. Use a nova senha no próximo acesso.' })
  }

  return (
    <div className="p-4 pt-16 lg:p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Trocar senha</h1>
      <form onSubmit={salvar} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <label className="grid gap-1.5 text-sm font-medium text-gray-700">Nova senha<input id="senha" name="senha" type="password" autoComplete="new-password" minLength={8} required className={campo} /></label>
        <label className="grid gap-1.5 text-sm font-medium text-gray-700">Repita a nova senha<input id="confirma" name="confirma" type="password" autoComplete="new-password" minLength={8} required className={campo} /></label>
        {msg && <p role="status" className={msg.ok ? 'text-sm text-emerald-700' : 'text-sm text-red-600'}>{msg.texto}</p>}
        <button type="submit" disabled={enviando} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{enviando ? 'Salvando…' : 'Salvar nova senha'}</button>
      </form>
    </div>
  )
}
