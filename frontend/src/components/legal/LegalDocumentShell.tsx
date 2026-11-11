import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { landingShellClass } from '@/components/landing/landingContent'

type LegalDocumentShellProps = {
  title: string
  updated: string
  children: React.ReactNode
}

export function LegalDocumentShell({ title, updated, children }: LegalDocumentShellProps) {
  return (
    <div className="min-h-screen bg-surface-page text-foreground">
      <header className="border-b border-border-subtle">
        <div className={`flex h-14 items-center justify-between ${landingShellClass}`}>
          <BrandLogo href="/" size="md" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors duration-150 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>
      </header>

      <main className={`py-10 sm:py-14 md:py-16 ${landingShellClass}`}>
        <div className="mx-auto max-w-2xl">
          <p className="text-xs text-text-tertiary sm:text-sm">Last updated {updated}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <div className="prose prose-sm mt-8 max-w-none sm:prose-base prose-headings:font-semibold prose-headings:text-foreground prose-headings:tracking-tight prose-p:text-text-secondary prose-p:leading-relaxed prose-li:text-text-secondary prose-strong:text-text-label prose-a:text-brand-text prose-a:no-underline hover:prose-a:underline">
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-border-subtle">
        <div
          className={`flex flex-col items-center justify-between gap-4 py-6 text-sm text-text-tertiary sm:flex-row sm:py-8 ${landingShellClass}`}
        >
          <p>© {new Date().getFullYear()} Reelysis</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition-colors duration-150 hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors duration-150 hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
