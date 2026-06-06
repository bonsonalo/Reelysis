'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Home, 
  BarChart3, 
  Video, 
  Users2, 
  Settings, 
  LogOut,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLogout } from '@/features/auth/hooks/useLogout'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'My Videos', href: '/videos', icon: Video },
  { name: 'Competitors', href: '/competitors', icon: Users2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { mutate: logout } = useLogout()

  return (
    <div className="flex h-full w-64 flex-col border-r border-white/5 bg-[#09090b]">
      {/* Logo */}
      <div className="flex h-20 items-center px-6">
        <Link href="/dashboard" className="text-xl font-black tracking-tighter text-white">
          REEL<span className="text-primary">YSIS</span>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1 px-4 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary shadow-sm shadow-primary/5" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-white"
              )} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-white/5 p-4 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            pathname === '/settings' 
              ? "bg-white/5 text-white" 
              : "text-muted-foreground hover:bg-white/5 hover:text-white"
          )}
        >
          <Settings className="mr-3 h-5 w-5" />
          Settings
        </Link>
        
        <button
          onClick={() => logout()}
          className="group flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Log out
        </button>
      </div>
    </div>
  )
}
