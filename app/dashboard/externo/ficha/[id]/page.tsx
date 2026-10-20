import { notFound } from 'next/navigation'
import FichaForm from '@/components/externo/FichaForm'
import BotaoApagar from '@/components/externo/BotaoApagar'
import { sessaoExterno, rotasDaEmpresa } from '@/lib/externo/sessao'
import { apagarFicha } from '@/app/dashboard/externo/acoes'
import { hojeSP, dmy } from '@/lib/externo/metricas'

export const dynamic = 'force-dynamic'

export default async function EditarFicha({ params }: { params: { id: string } }) {
  const { supabase, profile, podeEditar } = await sessaoExterno()
  const { data } = await supabase.from('ext_visitas').select('*, empresa:ext_empresas(*)').eq('id', params.id).single()
  if (!data) notFound()
  const { empresa, ...visita } = data as any
  const rotas = await rotasDaEmpresa(supabase, profile.company_id)
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Visita · {empresa?.nome}</h2>
        <p className="text-sm text-gray-500">Visita de {dmy(visita.data_visita)}{visita.origem === 'planilha' ? ' · importada da planilha' : ''}</p>
      </div>
      {podeEditar ? (
        <>
          <FichaForm empresa={empresa} visita={visita} rotas={rotas} hoje={hojeSP()} />
          <form action={apagarFicha}>
            <input type="hidden" name="visita_id" value={visita.id} />
            <BotaoApagar />
          </form>
        </>
      ) : (
        <dl className="grid gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2 text-sm">
          {[
            ['Rota', empresa?.rota], ['Contato', empresa?.contato], ['Telefone', empresa?.telefone], ['Chegada / saída', [visita.hora_chegada?.slice(0, 5), visita.hora_saida?.slice(0, 5)].filter(Boolean).join(' – ')],
            ['Nº de funcionários', visita.n_funcionarios], ['Já compra uniforme?', visita.ja_compra_uniforme], ['Já comprou da LAESC?', visita.ja_comprou_laesc],
            ['Expectativa (peças)', visita.expectativa_pecas], ['Possibilidade', visita.possibilidade], ['Peças vendidas', visita.pecas_vendidas], ['Faturamento', visita.faturamento],
            ['Agendamento', visita.agendamento], ['Obs', visita.obs],
          ].map(([k, v]) => (
            <div key={String(k)}><dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{k}</dt><dd className="text-gray-900">{v ?? '—'}</dd></div>
          ))}
        </dl>
      )}
    </div>
  )
}
