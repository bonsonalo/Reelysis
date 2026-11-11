'use client'

import { usePathname } from 'next/navigation'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'

const DASHBOARD_ROOTS = ['/dashboard', '/competitors', '/reports', '/settings', '/videos']

/** The dashboard layout bootstraps auth itself; everywhere else we do it here. */
function isDashboardRoute(pathname: string): boolean {
  return DASHBOARD_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`))
}

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  useCurrentUser({ enabled: !isDashboardRoute(pathname) })

  return <>{children}</>
}
