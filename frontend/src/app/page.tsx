'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { Menu, X } from 'lucide-react'
import {
  LandingAudienceColumns,
  LandingBenchmarkSplit,
  LandingBentoFeatures,
  LandingFaqList,
  LandingInsightRows,
  LandingMetricsGrid,
  LandingReportSplit,
  LandingStepsRow,
  LandingSyncTimeline,
} from '@/components/landing/LandingBlocks'
import { LandingPreview } from '@/components/landing/LandingPreview'
import { LandingSection, LandingShell } from '@/components/landing/LandingSection'
import {
  audiences,
  capabilities,
  competitorBenefits,
  dashboardMetrics,
  faqs,
  insightCards,
  landingShellClass,
  reportIncludes,
  steps,
  syncAnalysis,
} from '@/components/landing/landingContent'
import { Button } from '@/components/ui/button'
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
    <div className="min-h-screen bg-surface-page text-white">
      <header className="sticky top-0 z-50 border-b border-border-sidebar bg-surface-page/90 backdrop-blur-sm">
        <div className={`flex h-14 items-center justify-between gap-3 ${landingShellClass}`}>
          <BrandLogo href="/" size="md" />
          <nav className="hidden items-center gap-6 text-sm text-text-secondary lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors duration-150 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href={ctaHref} className="hidden sm:block">
              <Button size="sm">{ctaLabel}</Button>
            </Link>
            <button
              type="button"
              className="rounded-md p-2 text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-white lg:hidden"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="border-t border-border-subtle lg:hidden">
            <nav className={`flex flex-col gap-1 px-4 py-3 sm:px-6 ${landingShellClass}`}>
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2.5 text-sm text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-white"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <Link href={ctaHref} className="mt-2 sm:hidden" onClick={() => setMobileNavOpen(false)}>
                <Button size="sm" className="w-full">
                  {ctaLabel}
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        <section className="pb-12 pt-16 sm:pb-16 sm:pt-20 md:pb-24 md:pt-28 lg:pt-32">
          <LandingShell>
            <div className="mx-auto max-w-2xl text-center lg:max-w-3xl">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Know exactly what to post{' '}
                <span className="text-primary">next.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-text-secondary md:text-lg">
                Reelysis explains your Instagram Reels. See which{' '}
                <span className="text-text-label">hooks</span> work, which{' '}
                <span className="text-text-label">themes</span> drive engagement, and what{' '}
                <span className="text-primary">competitors</span> in your niche are doing
                differently.
              </p>
              <div className="mt-8 flex justify-center px-2">
                <Link href={ctaHref} className="w-full max-w-xs sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto">
                    {ctaLabel}
                  </Button>
                </Link>
              </div>
            </div>
            <LandingPreview />
          </LandingShell>
        </section>

        <LandingSection
          title="Instagram shows the numbers. Reelysis explains them."
          description="Views and likes tell you something happened. They don't tell you which opening kept people watching, which topic to repeat, or how you stack up against creators in the same niche."
          bordered={false}
        >
          <LandingInsightRows items={insightCards} />
        </LandingSection>

        <LandingSection
          id="how-it-works"
          title="How it works"
          description="Three steps from connect to a strategy you can execute this week."
        >
          <LandingStepsRow steps={steps} />
        </LandingSection>

        <LandingSection
          id="features"
          title="Everything in one workspace"
          description="After you connect Instagram, the dashboard, competitor list, and reports all draw from the same synced data."
        >
          <LandingBentoFeatures items={capabilities} />
        </LandingSection>

        <LandingSection
          title="Your dashboard, at a glance"
          description="The metrics that matter for Reels growth, updated every time you run a sync. Trend lines show direction, not just totals."
        >
          <LandingMetricsGrid items={dashboardMetrics} />
        </LandingSection>

        <LandingSection
          title="What happens on every sync"
          description="Each analysis run imports your latest Reels, transcribes audio where possible, scores content, and refreshes competitor data for reports."
        >
          <LandingSyncTimeline items={syncAnalysis} />
        </LandingSection>

        <LandingSection
          id="reports"
          title="Strategy reports that go beyond metrics"
          description="Generate a full write-up when you are ready. Reports stay in your account so you can revisit, track progress, and regenerate as your library grows."
        >
          <LandingReportSplit items={reportIncludes} />
        </LandingSection>

        <LandingSection
          title="Benchmark against your niche"
          description="Stop guessing who to compare yourself to. Track real accounts, see their engagement, and let that context shape your strategy."
        >
          <LandingBenchmarkSplit items={competitorBenefits} />
        </LandingSection>

        <LandingSection
          title="Built for people who post Reels on purpose"
          description="Whether you're growing a personal brand or running content for a business, the same question applies: what should the next Reel be?"
        >
          <LandingAudienceColumns items={audiences} />
        </LandingSection>

        <LandingSection
          id="faq"
          title="Common questions"
          description="Quick answers before you connect your account."
        >
          <LandingFaqList items={faqs} />
        </LandingSection>

        <section className="border-t border-border-subtle py-12 sm:py-16 md:py-20">
          <LandingShell>
            <div className="rounded-md border border-border-subtle bg-surface-card px-5 py-8 text-center sm:px-8 sm:py-10 md:px-12 md:py-14">
              <h2 className="text-lg font-semibold text-white sm:text-xl md:text-2xl">
                Start with your existing Reels
              </h2>
              <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-text-secondary md:text-base">
                Connect Instagram, run your first sync, and see hook scores, content pillars,
                and competitor context. Then generate your first{' '}
                <span className="text-primary">strategy report</span>
                {' '}when you&apos;re ready.
              </p>
              <Link href={ctaHref} className="mt-8 inline-block w-full max-w-xs sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  {ctaLabel}
                </Button>
              </Link>
            </div>
          </LandingShell>
        </section>
      </main>

      <footer className="border-t border-border-subtle">
        <div
          className={`flex flex-col items-center justify-between gap-4 py-6 text-sm text-text-tertiary sm:flex-row sm:py-8 ${landingShellClass}`}
        >
          <BrandLogo href="/" size="sm" />
          <p>© {new Date().getFullYear()} Reelysis</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition-colors duration-150 hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors duration-150 hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
