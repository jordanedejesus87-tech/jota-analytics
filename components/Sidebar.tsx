'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import {
  LayoutDashboard,
  TrendingUp,
  Settings,
  LogOut,
  BarChart2,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'

interface SidebarProps {
  profile: Profile
  onClose?: () => void
}

export default function Sidebar({ profile, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    {
      href: '/dashboard',
      label: 'DFC Financeiro',
      icon: LayoutDashboard,
      // commercial não vê DFC — apenas admin/system e client
      roles: ['admin', 'system', 'client'],
    },
    {
      href: '/dashboard/comercial',
      label: 'Comercial',
      icon: TrendingUp,
      roles: ['admin', 'system', 'commercial'],
    },
    {
      href: '/dashboard/admin',
      label: 'Administração',
      icon: Settings,
      roles: ['admin', 'system'],
    },
  ]

  const visibleItems = navItems.filter(item =>
    item.roles.includes(profile.role)
  )

  return (
    <aside className="flex flex-col h-full bg-white border-r border-gray-200 w-64">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">JOTA Analytics</p>
            <p className="text-xs text-gray-400">{profile.company?.name ?? 'Dashboard'}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className={clsx('w-4 h-4', active ? 'text-indigo-600' : 'text-gray-400')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User Info + Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">{profile.name}</p>
          <p className="text-xs text-gray-400 capitalize">{profile.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
