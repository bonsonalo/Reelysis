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
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-surface-page text-white">
      <header className="shrink-0 border-b border-border-subtle">
        <div
          className={`flex h-14 items-center justify-between ${landingShellClass}`}
        >
          <BrandLogo href="/" size="md" />
          {isConnected && (
            <span className="rounded-[10px] border border-border-subtle bg-surface-card px-3 py-1 text-xs text-text-secondary">
              Instagram connected
            </span>
          )}
        </div>
      </header>

      <main className="relative flex-1">{children}</main>
    </div>
  )
}
