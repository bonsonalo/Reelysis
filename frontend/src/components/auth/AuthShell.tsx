import { BrandLogo } from '@/components/shared/BrandLogo'
import { Panel } from '@/components/shared/Panel'
import { landingShellClass } from '@/components/landing/landingContent'

type AuthShellProps = {
  children: React.ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-surface-page text-white">
      <header className="shrink-0 border-b border-border-subtle">
        <div className={`flex h-14 items-center ${landingShellClass}`}>
          <BrandLogo href="/" size="md" />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:px-6 sm:py-12 md:py-16">
        <Panel className="w-full max-w-[400px] p-5 sm:p-8 md:p-10">{children}</Panel>
      </main>
    </div>
  )
}
