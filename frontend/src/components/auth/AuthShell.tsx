import Link from 'next/link'
import { BrandLogo } from '@/components/shared/BrandLogo'

type AuthShellProps = {
  children: React.ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-surface-subtle text-foreground">
      <header className="shrink-0 px-4 pt-6 sm:px-8 sm:pt-8">
        <BrandLogo href="/" size="md" />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-10 pt-10 sm:items-center sm:px-6 sm:pt-6">
        <div className="w-full max-w-[400px] rounded-xl border border-border-subtle bg-white p-6 shadow-overlay sm:p-8">
          {children}
        </div>
      </main>

      <footer className="flex shrink-0 justify-center gap-5 pb-6 text-[13px] text-text-tertiary">
        <span>© {new Date().getFullYear()} Reelysis</span>
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
      </footer>
    </div>
  )
}
