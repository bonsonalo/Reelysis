'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronsUpDown,
  Clapperboard,
  FileText,
  House,
  LogOut,
  Settings,
  UsersRound,
  X,
} from 'lucide-react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { ThemeSwitchButton, ThemeToggle } from '@/components/shared/ThemeToggle'
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { cn } from '@/lib/utils'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { useAuth, useAppDispatch } from '@/store/hook'
import { closeMobileSidebar } from '@/store/slices/sidebarSlice'

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: House },
  { name: 'Reels', href: '/videos', icon: Clapperboard },
  { name: 'Competitors', href: '/competitors', icon: UsersRound },
  { name: 'Reports', href: '/reports', icon: FileText },
]

function SidebarUserMenu({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname()
  const { currentUser } = useAuth()
  const { mutate: logout } = useLogout()
  const { data: accounts } = useInstagramAccounts()
  const account = accounts?.[0]
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
    <div ref={rootRef} className="relative p-3">
      {open && (
        <div
          className="absolute bottom-full left-3 right-3 mb-1.5 overflow-hidden rounded-lg border border-border-subtle bg-popover p-1 shadow-overlay"
          role="menu"
        >
          <div className="flex items-center justify-between gap-3 px-2.5 py-1.5">
            <span className="text-[13px] text-text-secondary">Theme</span>
            <ThemeToggle compact />
          </div>
          <div className="my-1 border-t border-border-subtle" />
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onNavigate()
            }}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text-label transition-colors duration-150 hover:bg-surface-hover hover:text-foreground',
              pathname === '/settings' && 'text-foreground',
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
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text-label transition-colors duration-150 hover:bg-surface-hover hover:text-danger"
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
          'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-hover',
          open && 'bg-surface-pressed',
        )}
      >
        <UserAvatar
          name={currentUser.name}
          email={currentUser.email}
          imageUrl={account?.profile_picture_url}
          className="h-7 w-7 text-[11px]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight text-foreground">{displayName}</p>
          <p className="truncate text-xs leading-tight text-text-tertiary">{currentUser.email}</p>
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
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 pl-5 pr-3">
        <BrandLogo size="md" onClick={handleNavClick} />
        <div className="flex items-center gap-0.5">
          <ThemeSwitchButton />
          <button
            type="button"
            onClick={() => dispatch(closeMobileSidebar())}
            className="rounded-md p-1.5 text-text-tertiary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-px px-3 py-2" aria-label="Main">
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
                'group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150',
                isActive
                  ? 'bg-brand-tint font-medium text-foreground'
                  : 'text-text-secondary hover:bg-nav-hover hover:text-foreground',
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors duration-150',
                  isActive
                    ? 'text-primary'
                    : 'text-text-tertiary group-hover:text-text-secondary',
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-1">
        <Link
          href="/settings"
          onClick={handleNavClick}
          className={cn(
            'group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150',
            pathname?.startsWith('/settings')
              ? 'bg-brand-tint font-medium text-foreground'
              : 'text-text-secondary hover:bg-nav-hover hover:text-foreground',
          )}
        >
          <Settings
            className={cn(
              'h-4 w-4 shrink-0',
              pathname?.startsWith('/settings')
                ? 'text-primary'
                : 'text-text-tertiary group-hover:text-text-secondary',
            )}
          />
          Settings
        </Link>
      </div>

      <div className="mx-3 border-t border-border-subtle" />
      <SidebarUserMenu onNavigate={handleNavClick} />
    </div>
  )
}
