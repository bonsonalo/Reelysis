'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  ChevronsUpDown,
  Home,
  LogOut,
  Settings,
  Users2,
  Video,
  X,
} from 'lucide-react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { cn } from '@/lib/utils'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { useAuth, useAppDispatch } from '@/store/hook'
import { closeMobileSidebar } from '@/store/slices/sidebarSlice'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'My Videos', href: '/videos', icon: Video },
  { name: 'Competitors', href: '/competitors', icon: Users2 },
]

function getInitials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.trim().slice(0, 2).toUpperCase()
  }
  return (email?.[0] ?? 'U').toUpperCase()
}

function SidebarUserMenu({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname()
  const { currentUser } = useAuth()
  const { mutate: logout } = useLogout()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  if (!currentUser) return null

  const displayName = currentUser.name?.trim() || currentUser.email?.split('@')[0] || 'Account'

  return (
    <div ref={rootRef} className="relative border-t border-border-sidebar p-3">
      {open && (
        <div
          className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-[10px] border border-border-subtle bg-surface-input py-1"
          role="menu"
        >
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onNavigate()
            }}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors duration-150 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
              pathname === '/settings' ? 'text-white' : 'text-text-label hover:text-white',
            )}
          >
            <Settings className="h-4 w-4 shrink-0 text-text-tertiary" />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              logout()
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-text-label transition-colors duration-150 hover:bg-white/[0.06] hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            <LogOut className="h-4 w-4 shrink-0 text-text-tertiary" />
            Log out
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left transition-[background-color,transform] duration-150 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
          open && 'bg-white/[0.06]',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
          {getInitials(currentUser.name, currentUser.email)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{displayName}</p>
          <p className="truncate text-xs text-text-secondary">{currentUser.email}</p>
        </div>
        <ChevronsUpDown
          className={cn(
            'h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const dispatch = useAppDispatch()

  const handleNavClick = () => {
    dispatch(closeMobileSidebar())
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border-sidebar px-6">
        <BrandLogo size="md" onClick={handleNavClick} />
        <button
          type="button"
          onClick={() => dispatch(closeMobileSidebar())}
          className="rounded-md p-1.5 text-text-tertiary transition-colors duration-150 hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 px-4 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-text-secondary hover:bg-white/[0.06] hover:text-white',
              )}
            >
              <item.icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors duration-150',
                  isActive
                    ? 'text-primary'
                    : 'text-text-tertiary group-hover:text-text-label',
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <SidebarUserMenu onNavigate={handleNavClick} />
    </div>
  )
}
