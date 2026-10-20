'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { BarChart3, Building2, Plus, CalendarCheck, Route, CalendarClock } from 'lucide-react'

// celular: false = só no computador (no celular, Rotas fica dentro de Empresas).
const ABAS = [
  { href: '/dashboard/externo', label: 'Painel', icon: BarChart3, editar: false, celular: true },
  { href: '/dashboard/externo/agenda', label: 'Agenda', icon: CalendarClock, editar: false, celular: true },
  { href: '/dashboard/externo/ficha/nova', label: 'Nova visita', icon: Plus, editar: true, celular: true },
  { href: '/dashboard/externo/visitas', label: 'Visitas', icon: CalendarCheck, editar: false, celular: true },
  { href: '/dashboard/externo/empresas', label: 'Empresas', icon: Building2, editar: false, celular: true },
  { href: '/dashboard/externo/rotas', label: 'Rotas', icon: Route, editar: false, celular: false },
]

function useAtivo() {
  const path = usePathname()
  return (href: string) =>
    href === '/dashboard/externo' ? path === href : path.startsWith(href) || (href.endsWith('/visitas') && /\/ficha\/\d+/.test(path)) || (href.endsWith('/empresas') && path.startsWith('/dashboard/externo/rotas'))
}

// Computador: abas no topo. Celular: barra fixa embaixo, ao alcance do polegar, com "Nova visita" em destaque.
export default function AbasExterno({ podeEditar }: { podeEditar: boolean }) {
  const ativo = useAtivo()
  const abas = ABAS.filter((a) => podeEditar || !a.editar)
  return (
    <>
      <nav aria-label="Vendedor externo" className="hidden lg:flex gap-1 border-b border-gray-200">
        {abas.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={ativo(href) ? 'page' : undefined}
            className={clsx('flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', ativo(href) ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800')}>
            <Icon className="w-4 h-4" />{label}
          </Link>
        ))}
      </nav>

      <nav aria-label="Vendedor externo" className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${abas.filter((a) => a.celular).length}, minmax(0, 1fr))` }}>
          {abas.filter((a) => a.celular).map(({ href, label, icon: Icon, editar }) => (
            <Link key={href} href={href} aria-current={ativo(href) ? 'page' : undefined}
              className={clsx('flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium min-h-[60px]', ativo(href) ? 'text-indigo-700' : 'text-gray-500')}>
              {editar ? (
                <span className={clsx('flex h-10 w-10 items-center justify-center rounded-full shadow -mt-5 ring-4 ring-white', ativo(href) ? 'bg-indigo-700' : 'bg-indigo-600')}>
                  <Icon className="w-5 h-5 text-white" />
                </span>
              ) : (
                <Icon className="w-5 h-5" />
              )}
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
