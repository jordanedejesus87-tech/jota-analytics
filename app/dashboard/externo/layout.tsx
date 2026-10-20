import AbasExterno from '@/components/externo/AbasExterno'
import { sessaoExterno } from '@/lib/externo/sessao'

export default async function ExternoLayout({ children }: { children: React.ReactNode }) {
  const { podeEditar, gestor } = await sessaoExterno()
  return (
    <div className="p-4 pt-16 pb-28 lg:p-6 lg:pt-6 lg:pb-6 max-w-5xl mx-auto space-y-5">
      <div className="lg:hidden sticky top-0 z-20 -mx-4 -mt-16 flex h-16 items-center border-b border-gray-200 bg-gray-50/95 pl-[4.5rem] pr-4 backdrop-blur">
        <p className="text-sm font-semibold text-gray-900">Vendedor externo · LAESC</p>
      </div>
      <div className="hidden lg:block">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Vendedor externo</p>
        <h1 className="hidden lg:block text-xl font-bold text-gray-900">{gestor ? 'Dashboard de vendas externas' : 'Visitas e resultados'}</h1>
      </div>
      <AbasExterno podeEditar={podeEditar} gestor={gestor} />
      {children}
    </div>
  )
}
