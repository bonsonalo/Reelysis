'use client'

import { BrandLogo } from '@/components/shared/BrandLogo'
import { landingShellClass } from '@/components/landing/landingContent'
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: accounts } = useInstagramAccounts()
  const isConnected = accounts && accounts.length > 0

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="shrink-0 border-b border-border-subtle bg-surface-card">
        <div
          className={`flex h-14 items-center justify-between ${landingShellClass}`}
        >
          <BrandLogo href="/" size="md" />
          {isConnected && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success-tint px-2.5 py-1 text-xs font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              Instagram connected
            </span>
          )}
        </div>
      </header>

      <main className="relative flex-1">{children}</main>
    </div>
  )
}
