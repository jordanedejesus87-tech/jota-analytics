'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Company, Profile } from '@/lib/types'
import { Upload, Users, Building2, Database, CheckCircle, AlertCircle, KeyRound, X, Eye, EyeOff } from 'lucide-react'

interface Snapshot {
  id: string
  company_id: string
  year: number
  period_label: string
  created_at: string
  company: { name: string } | null
}

interface Props {
  companies: Company[]
  profiles: (Profile & { company: { name: string } | null })[]
  snapshots: Snapshot[]
  logins: { id: string; email: string; ultimo_acesso: string | null }[]
  meuId: string
}

type Tab = 'usuarios' | 'empresas' | 'dfc'

export default function AdminPanel({ companies: initialCompanies, profiles, snapshots: initialSnapshots, logins, meuId }: Props) {
  const loginDe = (id: string) => logins.find((l) => l.id === id)
  const [senhaDe, setSenhaDe] = useState<null | { id: string; nome: string; email: string }>(null)
  const [novaSenha, setNovaSenha] = useState('')
  const [verSenha, setVerSenha] = useState(true)
  const [senhaMsg, setSenhaMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  function gerarSenha() {
    const letras = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'
    const nums = '23456789'
    const pick = (s: string, n: number) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => s[x % s.length]).join('')
    setNovaSenha(pick(letras, 1).toUpperCase() + pick(letras, 5).toLowerCase() + '@' + pick(nums, 4))
  }

  async function salvarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (!senhaDe) return
    if (novaSenha.length < 8) return setSenhaMsg({ ok: false, text: 'A senha precisa ter pelo menos 8 caracteres.' })
    setSalvandoSenha(true)
    setSenhaMsg(null)
    const { error } = await supabase.rpc('admin_definir_senha', { p_user: senhaDe.id, p_senha: novaSenha })
    setSalvandoSenha(false)
    if (error) return setSenhaMsg({ ok: false, text: error.message || 'Não foi possível salvar a senha.' })
    setSenhaMsg({ ok: true, text: `Senha de ${senhaDe.nome} definida. Login: ${senhaDe.email} · Senha: ${novaSenha}` })
  }

  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('usuarios')
  const [snapshots, setSnapshots] = useState(initialSnapshots)
  const [companies] = useState(initialCompanies)

  // Upload DFC
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id ?? '')
  const [uploadYear, setUploadYear] = useState(2026)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleDFCUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !selectedCompany) return

    setUploading(true)
    setUploadMsg(null)

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      const { error } = await supabase
        .from('dfc_snapshots')
        .upsert({
          company_id: selectedCompany,
          year: uploadYear,
          period_label: data.period_label ?? `${uploadYear}`,
          data,
        }, { onConflict: 'company_id,year' })

      if (error) throw error

      // Refresh snapshots
      const { data: fresh } = await supabase
        .from('dfc_snapshots')
        .select('id, company_id, year, period_label, created_at, company:companies(name)')
        .order('created_at', { ascending: false })

      setSnapshots((fresh as unknown as Snapshot[]) ?? [])
      setUploadMsg({ ok: true, text: 'DFC carregado com sucesso!' })
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setUploadMsg({ ok: false, text: 'Erro ao processar JSON. Verifique o arquivo.' })
    }
    setUploading(false)
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'usuarios', label: 'Usuários', icon: Users },
    { key: 'empresas', label: 'Empresas', icon: Building2 },
    { key: 'dfc',      label: 'Upload DFC', icon: Database },
  ]

  const ROLE_LABEL: Record<string, string> = { admin: 'Admin', system: 'Sistema', client: 'Dono / cliente', commercial: 'Comercial', externo: 'Vendedor externo' }
  const ROLE_COLOR: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    client: 'bg-blue-100 text-blue-700',
    commercial: 'bg-green-100 text-green-700',
    externo: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administração</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerenciamento da plataforma JOTA Analytics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Usuários */}
      {tab === 'usuarios' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Usuários Cadastrados</h2>
            <span className="text-xs text-gray-400">{profiles.length} usuário(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase text-gray-400 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Nome</th>
                  <th className="text-left px-5 py-3 font-medium">Login (e-mail)</th>
                  <th className="text-left px-5 py-3 font-medium">Empresa</th>
                  <th className="text-left px-5 py-3 font-medium">Perfil</th>
                  <th className="text-left px-5 py-3 font-medium">Último acesso</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {profiles.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-5 py-3 text-gray-600">{loginDe(p.id)?.email ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{p.company?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLOR[p.role] ?? ''}`}>
                        {ROLE_LABEL[p.role] ?? p.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {loginDe(p.id)?.ultimo_acesso ? new Date(loginDe(p.id)!.ultimo_acesso!).toLocaleDateString('pt-BR') : 'nunca entrou'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {(!['admin', 'system'].includes(p.role) || p.id === meuId) && (
                        <button
                          onClick={() => { setSenhaDe({ id: p.id, nome: p.name, email: loginDe(p.id)?.email ?? '' }); setNovaSenha(''); setSenhaMsg(null); setVerSenha(true) }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 border border-indigo-200 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg whitespace-nowrap"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Definir senha
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
            <p className="text-xs text-amber-700">
              As senhas não ficam visíveis em lugar nenhum (nem aqui, nem no Supabase). Use “Definir senha” para criar uma nova,
              passe para a pessoa e peça que ela troque em “Trocar senha” no primeiro acesso.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Empresas */}
      {tab === 'empresas' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Empresas Cadastradas</h2>
            <span className="text-xs text-gray-400">{companies.length} empresa(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase text-gray-400 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Nome</th>
                  <th className="text-left px-5 py-3 font-medium">Slug</th>
                  <th className="text-left px-5 py-3 font-medium">Cadastrada em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {companies.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{c.slug}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-blue-50 border-t border-blue-100">
            <p className="text-xs text-blue-700">
              Para adicionar empresas, execute um INSERT na tabela companies via Supabase SQL Editor.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Upload DFC */}
      {tab === 'dfc' && (
        <div className="space-y-5">
          {/* Upload form */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Carregar Dados DFC (JSON)</h2>
            <form onSubmit={handleDFCUpload} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Empresa</label>
                  <select
                    value={selectedCompany}
                    onChange={e => setSelectedCompany(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Ano</label>
                  <input
                    type="number"
                    value={uploadYear}
                    onChange={e => setUploadYear(parseInt(e.target.value))}
                    min={2020}
                    max={2030}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Arquivo JSON (gerado pelo script build_dfc_laesc.py)
                </label>
                <input
                  type="file"
                  ref={fileRef}
                  accept=".json"
                  required
                  className="w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium file:text-sm hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>
              {uploadMsg && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${uploadMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {uploadMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {uploadMsg.text}
                </div>
              )}
              <button
                type="submit"
                disabled={uploading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Enviando...' : 'Carregar DFC'}
              </button>
            </form>
          </div>

          {/* Snapshots existentes */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Snapshots DFC Carregados</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase text-gray-400 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Empresa</th>
                  <th className="text-left px-5 py-3 font-medium">Ano</th>
                  <th className="text-left px-5 py-3 font-medium">Período</th>
                  <th className="text-left px-5 py-3 font-medium">Carregado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {snapshots.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400">Nenhum snapshot carregado ainda.</td>
                  </tr>
                )}
                {snapshots.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{s.company?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{s.year}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{s.period_label}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(s.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {senhaDe && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Definir senha</h2>
                <p className="text-sm text-gray-500 mt-0.5">{senhaDe.nome} · {senhaDe.email}</p>
              </div>
              <button onClick={() => setSenhaDe(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {senhaMsg?.ok ? (
              <div className="space-y-4">
                <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 flex items-start gap-2"><CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />{senhaMsg.text}</p>
                <p className="text-xs text-gray-500">Anote agora — depois de fechar, a senha não aparece mais.</p>
                <button onClick={() => setSenhaDe(null)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg">Fechar</button>
              </div>
            ) : (
              <form onSubmit={salvarSenha} className="space-y-4">
                <label className="block">
                  <span className="block text-xs font-semibold text-gray-600 mb-1">Nova senha (mínimo 8 caracteres)</span>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input type={verSenha ? 'text' : 'password'} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button type="button" onClick={() => setVerSenha(!verSenha)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{verSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                    <button type="button" onClick={gerarSenha} className="px-3 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Gerar</button>
                  </div>
                </label>
                {senhaMsg && !senhaMsg.ok && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{senhaMsg.text}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setSenhaDe(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={salvandoSenha} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg">{salvandoSenha ? 'Salvando…' : 'Salvar senha'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
