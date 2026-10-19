'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { BarChart3, Building2, PlusCircle, CalendarCheck } from 'lucide-react'

const ABAS = [
  { href: '/dashboard/externo', label: 'Painel', icon: BarChart3, editar: false },
  { href: '/dashboard/externo/empresas', label: 'Empresas', icon: Building2, editar: false },
  { href: '/dashboard/externo/ficha/nova', label: 'Nova ficha', icon: PlusCircle, editar: true },
  { href: '/dashboard/externo/visitas', label: 'Visitas', icon: CalendarCheck, editar: false },
]

export default function AbasExterno({ podeEditar }: { podeEditar: boolean }) {
  const path = usePathname()
  const ativo = (href: string) => (href === '/dashboard/externo' ? path === href : path.startsWith(href) || (href.endsWith('/visitas') && /\/ficha\/\d+/.test(path)))
  return (
    <nav aria-label="Vendedor externo" className="flex gap-1 overflow-x-auto border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0">
      {ABAS.filter((a) => podeEditar || !a.editar).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={ativo(href) ? 'page' : undefined}
          className={clsx(
            'flex items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
            ativo(href) ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
