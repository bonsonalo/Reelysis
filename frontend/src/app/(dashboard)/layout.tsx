'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Menu } from 'lucide-react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { PageContainer } from '@/components/shared/Panel'
import { Sidebar } from '@/components/shared/Sidebar'
import { ThemeSwitchButton } from '@/components/shared/ThemeToggle'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { EmailVerificationBanner } from '@/features/auth/components/EmailVerificationBanner'
import { useAuth, useAppDispatch, useSidebar } from '@/store/hook'
import { openMobileSidebar } from '@/store/slices/sidebarSlice'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { currentUser } = useAuth()
  const { data: user, isLoading } = useCurrentUser()
  const { isMobileOpen, closeMobileSidebar } = useSidebar()
  // Decide from the query itself: Redux is synced in an effect and lags one render.
  const isAuthenticated = Boolean(user)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        closeMobileSidebar()
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [closeMobileSidebar])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" aria-label="Loading" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] overflow-hidden bg-background text-foreground print:block print:h-auto print:overflow-visible print:bg-white print:text-black">
      <div
        className={cn(
          'print:hidden fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden',
          isMobileOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        )}
        onClick={closeMobileSidebar}
        aria-hidden={!isMobileOpen}
      />

      <aside
        className={cn(
          'print:hidden fixed inset-y-0 left-0 z-50 w-[232px] shrink-0 border-r border-border-sidebar bg-surface-sidebar transition-transform duration-200 ease-out lg:relative lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-background print:block print:bg-white">
        {(currentUser ?? user)?.email_verified === false && (
          <EmailVerificationBanner email={user?.email} />
        )}
        <header className="print:hidden flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-4 sm:px-6 lg:hidden">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-1">
            <ThemeSwitchButton />
            <button
              type="button"
              onClick={() => dispatch(openMobileSidebar())}
              className="rounded-md p-2 text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground "
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto print:overflow-visible">
          <PageContainer>{children}</PageContainer>
        </main>
      </div>
    </div>
  )
}
