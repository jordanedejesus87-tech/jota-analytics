'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface Props {
  profile: Profile
}

export default function SidebarWrapper({ profile }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar profile={profile} />
      </div>

      {/* Mobile toggle button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow border border-gray-200"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-50">
            <Sidebar profile={profile} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
