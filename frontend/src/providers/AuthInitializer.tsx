'use client'

import { usePathname } from 'next/navigation'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = ['/login', '/register', "/competitors", "/dashboard", "/reports", "/settings", "/videos"].includes(pathname)

  // Only try to fetch the current user if we are on a protected page
  // This avoids triggering 401 -> refresh loop on login/register pages
  const { isLoading } = useCurrentUser({ enabled: !isPublicPage })

  return <>{children}</>
}
