import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { Button } from '@/components/ui/button'
import { landingShellClass } from '@/components/landing/landingContent'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-page text-white">
      <header className="border-b border-border-subtle">
        <div className={`flex h-14 items-center ${landingShellClass}`}>
          <BrandLogo href="/" size="md" />
        </div>
      </header>

      <main className={`flex flex-1 flex-col items-center justify-center px-4 py-16 text-center ${landingShellClass}`}>
        <p className="text-sm font-medium tabular-nums text-text-tertiary">404</p>
        <h1 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
          Page not found
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
