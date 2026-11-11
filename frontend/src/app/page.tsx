'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { Menu, X } from 'lucide-react'
import {
  LandingBenchmarkSplit,
  LandingFaqList,
  LandingFeatureGrid,
  LandingInsightRows,
  LandingReportSplit,
  LandingStepsRow,
} from '@/components/landing/LandingBlocks'
import { LandingPreview } from '@/components/landing/LandingPreview'
import { LandingHeading, LandingSection, LandingShell } from '@/components/landing/LandingSection'
import {
  capabilities,
  competitorBenefits,
  faqs,
  insightCards,
  landingShellClass,
  reportIncludes,
  steps,
} from '@/components/landing/landingContent'
import { buttonStyles } from '@/components/ui/button'
import { useAuth } from '@/store/hook'
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { postAuthDestination } from '@/features/instagram/utils'

export default function LandingPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  const { data: accounts, isLoading: isLoadingAccounts } = useInstagramAccounts({
    enabled: isAuthenticated,
  })

  useEffect(() => {
    if (isAuthenticated && !isLoadingAccounts && accounts !== undefined) {
      router.push(postAuthDestination(accounts))
    }
  }, [isAuthenticated, accounts, isLoadingAccounts, router])

  const ctaHref = isAuthenticated ? '/dashboard' : '/register'
  const ctaLabel = isAuthenticated ? 'Go to app' : 'Get started'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navLinks = [
    { href: '#how-it-works', label: 'How it works' },
    { href: '#features', label: 'Features' },
    { href: '#reports', label: 'Reports' },
    { href: '#faq', label: 'FAQ' },
  ]


  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow-overlay"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-white/90 backdrop-blur-md">
        <div className={`flex h-16 items-center justify-between gap-3 ${landingShellClass}`}>
          <div className="flex items-center gap-10">
            <BrandLogo href="/" size="md" />
            <nav
              className="hidden items-center gap-7 text-sm text-text-secondary lg:flex"
              aria-label="Sections"
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="transition-colors duration-150 hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {!isAuthenticated && (
              <Link
                href="/login"
                className={buttonStyles({ variant: 'ghost', className: 'hidden sm:inline-flex' })}
              >
                Sign in
              </Link>
            )}
            <Link href={ctaHref} className={buttonStyles({ className: 'hidden sm:inline-flex' })}>
              {ctaLabel}
            </Link>
            <button
              type="button"
              className="rounded-md p-2 text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground lg:hidden"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="border-t border-border-subtle bg-white lg:hidden">
            <nav className={`flex flex-col gap-1 py-3 ${landingShellClass}`} aria-label="Sections">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2.5 text-sm text-text-label transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
                {!isAuthenticated && (
                  <Link
                    href="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className={buttonStyles({ variant: 'outline' })}
                  >
                    Sign in
                  </Link>
                )}
                <Link
                  href={ctaHref}
                  onClick={() => setMobileNavOpen(false)}
                  className={buttonStyles({ className: isAuthenticated ? 'col-span-2' : undefined })}
                >
                  {ctaLabel}
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="main">
        <section className="pb-16 pt-12 sm:pt-16 md:pb-24 lg:pt-20">
          <LandingShell className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-14">
            <div className="max-w-[560px]">
              <h1 className="text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] text-foreground sm:text-[52px] lg:text-[60px]">
                Know what to post next.
              </h1>
              <p className="mt-6 text-[17px] leading-relaxed text-text-secondary sm:text-lg">
                Reelysis reads your Instagram Reels, scores every opening hook, and compares your
                work with the creators you compete with. You get a plan for the next Reel, not
                another views chart.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={ctaHref} className={buttonStyles({ size: 'lg' })}>
                  {ctaLabel}
                </Link>
                <a href="#how-it-works" className={buttonStyles({ size: 'lg', variant: 'outline' })}>
                  See how it works
                </a>
              </div>
              <p className="mt-5 text-[13px] text-text-tertiary">
                For creators, coaches and brands with an Instagram Business or Creator account.
              </p>
            </div>
            <LandingPreview />
          </LandingShell>
        </section>

        <LandingSection
          title="Instagram shows the numbers. Reelysis explains them."
          description="Views and likes tell you something happened. They don’t tell you which opening kept people watching, which topic to repeat, or how you compare with creators in the same niche."
          tinted
        >
          <LandingInsightRows items={insightCards} />
        </LandingSection>

        <LandingSection
          id="how-it-works"
          title="From connected account to a plan in three steps"
          description="Connect once. Every sync after that refreshes your Reels, scores and competitor data."
        >
          <LandingStepsRow steps={steps} />
        </LandingSection>

        <LandingSection
          id="features"
          title="Everything in one workspace"
          description="The dashboard, Reel library, competitor list and reports all draw from the same synced data."
          className="pt-0 sm:pt-0 md:pt-4"
        >
          <LandingFeatureGrid items={capabilities} />
        </LandingSection>

        <LandingSection
          id="reports"
          title="Strategy reports that go past the metrics"
          description="Generate a written report when you’re ready. It stays in your account, so you can work through the recommendations and regenerate as your library grows."
          tinted
        >
          <LandingReportSplit items={reportIncludes} />
        </LandingSection>

        <LandingSection
          title="Benchmark against your niche"
          description="Track real accounts that post what you post, and compare engagement on the same terms."
        >
          <LandingBenchmarkSplit items={competitorBenefits} />
        </LandingSection>

        <section
          id="faq"
          className="scroll-mt-16 border-t border-border-subtle py-16 sm:py-20 md:py-24"
        >
          <LandingShell className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <LandingHeading
              title="Common questions"
              description="Quick answers before you connect your account."
              className="mb-0 md:mb-0"
            />
            <LandingFaqList items={faqs} />
          </LandingShell>
        </section>

        <section className="border-t border-border-subtle bg-surface-subtle py-16 sm:py-20">
          <LandingShell className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-[560px]">
              <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-foreground md:text-[32px]">
                Start with the Reels you already have
              </h2>
              <p className="mt-3 text-base leading-relaxed text-text-secondary">
                Connect Instagram, run your first sync, and see hook scores, content pillars and
                competitor context within minutes.
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href={ctaHref} className={buttonStyles({ size: 'lg' })}>
                {ctaLabel}
              </Link>
              {!isAuthenticated && (
                <Link href="/login" className={buttonStyles({ size: 'lg', variant: 'outline' })}>
                  Sign in
                </Link>
              )}
            </div>
          </LandingShell>
        </section>
      </main>

      <footer className="border-t border-border-subtle">
        <div
          className={`flex flex-col gap-4 py-8 text-[13px] text-text-tertiary sm:flex-row sm:items-center sm:justify-between ${landingShellClass}`}
        >
          <div className="flex items-center gap-4">
            <BrandLogo href="/" size="sm" />
            <span>© {new Date().getFullYear()} Reelysis</span>
          </div>
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
