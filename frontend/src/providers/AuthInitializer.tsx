'use client'

import { usePathname } from 'next/navigation'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'

/** Routes where the root auth bootstrap should not call /me (handled elsewhere or guest-only). */
function shouldSkipAuthFetch(pathname: string): boolean {
  const guestRoutes = ['/', '/login', '/register', '/privacy', '/terms', '/onboarding']
  if (guestRoutes.includes(pathname)) return true
  if (pathname.startsWith('/onboarding')) return true

  const dashboardRoots = ['/dashboard', '/competitors', '/reports', '/settings', '/videos']
  return dashboardRoots.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  )
}

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  useCurrentUser({ enabled: !shouldSkipAuthFetch(pathname) })

  return <>{children}</>
}
