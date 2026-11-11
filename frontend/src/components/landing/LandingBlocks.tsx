'use client'

import { useState } from 'react'
import {
  BarChart3,
  Check,
  Clapperboard,
  ChevronDown,
  FileText,
  Layers,
  ListChecks,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/** Three plain rows under a heading — the "numbers vs. explanation" contrast. */
export function LandingInsightRows({
  items,
}: {
  items: { label: string; title: string; description: string }[]
}) {
  return (
    <dl className="grid border-t border-border-subtle md:grid-cols-3">
      {items.map((item, index) => (
        <div
          key={item.title}
          className={cn(
            'border-b border-border-subtle py-6 md:border-b-0 md:py-8',
            index > 0 && 'md:border-l md:pl-8',
            index < items.length - 1 && 'md:pr-8',
          )}
        >
          <dt className="text-base font-semibold text-foreground">{item.title}</dt>
          <dd className="mt-2 text-[15px] leading-relaxed text-text-secondary">
            {item.description}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** A real sequence, so it is numbered. */
export function LandingStepsRow({
  steps,
}: {
  steps: { step: string; title: string; description: string }[]
}) {
  return (
    <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
      {steps.map((item) => (
        <li key={item.step} className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-card text-[13px] font-semibold tabular-nums text-foreground">
              {item.step}
            </span>
            <span className="hidden h-px flex-1 bg-border-subtle md:block" aria-hidden />
          </div>
          <h3 className="mt-5 text-base font-semibold text-foreground">{item.title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
            {item.description}
          </p>
        </li>
      ))}
    </ol>
  )
}

const capabilityIcons: Record<string, LucideIcon> = {
  Dashboard: BarChart3,
  Reels: Clapperboard,
  Themes: Layers,
  Competitors: UsersRound,
  Reports: FileText,
  Roadmap: ListChecks,
}

/** Feature grid split by hairlines, not boxed into separate cards. */
export function LandingFeatureGrid({
  items,
}: {
  items: { tag: string; title: string; description: string }[]
}) {
  return (
    <div className="grid overflow-hidden rounded-xl border border-border-subtle bg-surface-card sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = capabilityIcons[item.tag] ?? BarChart3
        return (
          <div
            key={item.title}
            className="-mb-px -mr-px border-b border-r border-border-subtle p-6 md:p-7"
          >
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Icon className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden />
              {item.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
              {item.description}
            </p>
          </div>
        )
      })}
    </div>
  )
}

/** Report sections on the left, an excerpt of a generated report on the right. */
export function LandingReportSplit({
  items,
}: {
  items: { label: string; title: string; description: string; bullets: string[] }[]
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
      <ul className="divide-y divide-border-subtle border-y border-border-subtle">
        {items.map((item) => (
          <li key={item.title} className="py-5">
            <h3 className="text-[15px] font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
              {item.description}
            </p>
          </li>
        ))}
      </ul>

      <ReportExcerpt />
    </div>
  )
}

function ReportExcerpt() {
  const actions = [
    { text: 'Open with the mistake, not the fix, in your next three form Reels', done: true },
    { text: 'Move nutrition content to Sundays, where it out-reaches weekdays', done: false },
    { text: 'Test a 20-second cut of the squat series against the 45-second one', done: false },
  ]

  return (
    <figure
      className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-overlay sm:p-8"
      aria-label="Excerpt from an example strategy report"
    >
      <p className="text-[12px] text-text-tertiary">Example report for a fitness account, based on 30 Reels</p>
      <h3 className="mt-2 text-lg font-semibold tracking-[-0.01em] text-foreground">
        Executive summary
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        Your form-correction Reels earn 2.1× the engagement of routine walkthroughs, and the
        difference is the opening: the top five all name a mistake in the first line. Tracked
        accounts in your niche post nutrition content twice as often as you do, at a higher reach.
      </p>

      <h4 className="mt-6 text-sm font-semibold text-foreground">Recommendations</h4>
      <ul className="mt-3 space-y-2.5">
        {actions.map((action) => (
          <li key={action.text} className="flex gap-3 text-sm leading-snug">
            <span
              className={cn(
                'mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                action.done
                  ? 'border-ink bg-ink text-ink-foreground'
                  : 'border-border-strong bg-surface-card',
              )}
              aria-hidden
            >
              {action.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className={action.done ? 'text-text-tertiary line-through' : 'text-text-label'}>
              {action.text}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

/** Benchmark table on the left, the three things it gives you on the right. */
export function LandingBenchmarkSplit({
  items,
}: {
  items: { label: string; title: string; description: string }[]
}) {
  const rows = [
    { handle: 'you', followers: '18.4K', engagement: '5.8%', you: true },
    { handle: 'liftwithmara', followers: '42.1K', engagement: '6.9%' },
    { handle: 'coachdeniz', followers: '27.6K', engagement: '5.1%' },
    { handle: 'theformfix', followers: '113K', engagement: '3.7%' },
  ]

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-16">
      <div
        className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-overlay"
        role="img"
        aria-label="Example competitor benchmark table"
      >
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 border-b border-border-subtle bg-surface-subtle px-5 py-2.5 text-[12px] text-text-tertiary">
          <span>Account</span>
          <span className="w-16 text-right">Followers</span>
          <span className="w-20 text-right">Engagement</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.handle}
            className={cn(
              'grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b border-border-subtle px-5 py-3 text-sm last:border-b-0',
              row.you && 'bg-brand-tint',
            )}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  row.you ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-secondary',
                )}
              >
                {row.handle.slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate font-medium text-foreground">
                {row.you ? 'Your account' : `@${row.handle}`}
              </span>
            </span>
            <span className="w-16 text-right tabular-nums text-text-secondary">{row.followers}</span>
            <span className="w-20 text-right font-medium tabular-nums text-foreground">
              {row.engagement}
            </span>
          </div>
        ))}
      </div>

      <ul className="space-y-6">
        {items.map((item) => (
          <li key={item.title}>
            <h3 className="text-[15px] font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
              {item.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Accordion on hairlines. */
export function LandingFaqList({
  items,
}: {
  items: { question: string; answer: string }[]
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="divide-y divide-border-subtle border-y border-border-subtle">
      {items.map((item, index) => {
        const isOpen = openIndex === index
        const panelId = `faq-panel-${index}`

        return (
          <div key={item.question}>
            <h3>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-medium text-foreground hover:text-text-label"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                {item.question}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-200 ease-out motion-reduce:transition-none',
                    isOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>
            </h3>

            <div
              id={panelId}
              className={cn(
                'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-[62ch] pb-5 text-[15px] leading-relaxed text-text-secondary">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
