import AbasExterno from '@/components/externo/AbasExterno'
import { sessaoExterno } from '@/lib/externo/sessao'

export default async function ExternoLayout({ children }: { children: React.ReactNode }) {
  const { podeEditar } = await sessaoExterno()
  return (
    <div className="p-4 pt-16 lg:p-6 lg:pt-6 max-w-5xl mx-auto space-y-5">
      <div>
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Vendedor externo</p>
        <h1 className="text-xl font-bold text-gray-900">Ficha de atendimento e resultados</h1>
      </div>
      <AbasExterno podeEditar={podeEditar} />
      {children}
    </div>
  )
}
