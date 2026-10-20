import GerenciarRotas from '@/components/externo/GerenciarRotas'
import { sessaoExterno, rotasDaEmpresa, SEM_ROTA } from '@/lib/externo/sessao'

export const dynamic = 'force-dynamic'

export default async function Rotas() {
  const { supabase, profile, podeEditar } = await sessaoExterno()
  const [rotas, { data: empresas }] = await Promise.all([
    rotasDaEmpresa(supabase, profile.company_id),
    supabase.from('ext_empresas').select('rota').eq('company_id', profile.company_id).eq('ativo', true).limit(5000),
  ])
  const contagem: Record<string, number> = {}
  for (const e of empresas ?? []) contagem[e.rota] = (contagem[e.rota] ?? 0) + 1
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Rotas</h2>
        <p className="text-sm text-gray-500">Organize as empresas por rota. Ao cadastrar uma visita, escolha a rota da empresa.</p>
      </div>
      <GerenciarRotas rotas={rotas.map((nome) => ({ nome, empresas: contagem[nome] ?? 0 }))} semRota={contagem[SEM_ROTA] ?? 0} podeEditar={podeEditar} />
    </div>
  )
}
