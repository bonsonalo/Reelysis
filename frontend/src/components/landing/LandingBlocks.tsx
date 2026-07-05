'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const cardHover =
  'transition-colors duration-200 hover:bg-surface-hover'

const cardBase = cn(
  'cursor-pointer rounded-[10px] border border-border-subtle bg-surface-card',
  cardHover,
)

const rowHover = cn('cursor-pointer transition-colors duration-200 hover:bg-surface-hover')

function OrangeLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-primary">{children}</p>
  )
}

function BulletRows({ items }: { items: string[] }) {
  return (
    <div className="mt-4 space-y-2.5">
      {items.map((item) => (
        <div key={item} className="flex gap-3">
          <span
            className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-primary/90"
            aria-hidden
          />
          <span className="text-sm leading-relaxed text-text-label">{item}</span>
        </div>
      ))}
    </div>
  )
}

/** Stripe-style divided rows — one panel, not three separate cards. */
export function LandingInsightRows({
  items,
}: {
  items: { label: string; title: string; description: string }[]
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border-subtle">
      {items.map((item, index) => (
        <div
          key={item.title}
          className={cn(
            'grid gap-4 bg-surface-card p-5 sm:p-6 md:grid-cols-[120px_1fr] md:gap-8 md:p-8',
            index > 0 && 'border-t border-border-subtle',
          )}
        >
          <OrangeLabel>{item.label}</OrangeLabel>
          <div>
            <h3 className="text-base font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

type LandingStepCardProps = {
  step: string
  title: string
  description: string
  className?: string
}

export function LandingStepCard({ step, title, description, className }: LandingStepCardProps) {
  return (
    <div className={cn(cardBase, 'relative flex h-full flex-col p-6', className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border-subtle bg-surface-input">
        <span className="text-sm font-semibold tabular-nums text-white">{step}</span>
      </div>
      <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>
    </div>
  )
}

export function LandingStepsRow({
  steps,
}: {
  steps: { step: string; title: string; description: string }[]
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3 md:gap-5">
      {steps.map((item, index) => (
        <div key={item.step} className="relative">
          {index < steps.length - 1 && (
            <div
              className="pointer-events-none absolute left-[calc(50%+2.5rem)] top-10 hidden h-px w-[calc(100%-5rem+1.25rem)] bg-border-subtle md:block"
              aria-hidden
            />
          )}
          <LandingStepCard {...item} />
        </div>
      ))}
    </div>
  )
}

/** Vercel/Linear bento — mixed sizes, not a uniform 3×2 grid. */
export function LandingBentoFeatures({
  items,
}: {
  items: { tag: string; title: string; description: string }[]
}) {
  const spanClasses = [
    'sm:col-span-2 lg:col-span-2',
    '',
    '',
    '',
    '',
    'sm:col-span-2 lg:col-span-2',
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {items.map((item, index) => (
        <div
          key={item.title}
          className={cn(
            cardBase,
            'flex flex-col p-6',
            spanClasses[index],
            index === 0 && 'lg:p-8',
          )}
        >
          <OrangeLabel>{item.tag}</OrangeLabel>
          <h3
            className={cn(
              'mt-4 font-semibold text-white',
              index === 0 ? 'text-xl' : 'text-base',
            )}
          >
            {item.title}
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  )
}

type LandingMetricCardProps = {
  label: string
  metric: string
  title: string
  description: string
}

/** Unified stat strip — distinct from card grids. */
export function LandingMetricsGrid({
  items,
}: {
  items: LandingMetricCardProps[]
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border-subtle bg-surface-sidebar">
      <div className="grid divide-y divide-border-subtle sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.title}
            className={cn('bg-surface-card p-5 sm:p-6', rowHover)}
          >
            <OrangeLabel>{item.label}</OrangeLabel>
            <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums text-white sm:text-3xl">
              {item.metric}
            </p>
            <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Linear-style vertical timeline — no card grid. */
export function LandingSyncTimeline({
  items,
}: {
  items: { title: string; description: string; bullets: string[] }[]
}) {
  return (
    <div className="relative border-l border-border-subtle pl-6 sm:pl-8 md:pl-10">
      {items.map((item, index) => (
        <div
          key={item.title}
          className={cn('relative pb-10 last:pb-0', index < items.length - 1 && 'mb-2')}
        >
          <span className="absolute -left-[calc(1.5rem+0.5px)] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-surface-card text-xs font-semibold tabular-nums text-text-label sm:-left-[calc(2rem+0.5px)] md:-left-[calc(2.5rem+0.5px)]">
            {String(index + 1).padStart(2, '0')}
          </span>
          <OrangeLabel>Step {index + 1}</OrangeLabel>
          <h3 className="mt-2 text-base font-semibold text-white">{item.title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
            {item.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.bullets.map((bullet) => (
              <span
                key={bullet}
                className="rounded-md border border-border-subtle bg-surface-card px-2.5 py-1 text-xs text-text-label"
              >
                {bullet}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Split layout — featured report block + compact list (Stripe product pages). */
export function LandingReportSplit({
  items,
}: {
  items: { label: string; title: string; description: string; bullets: string[] }[]
}) {
  const [featured, ...rest] = items

  return (
    <div className="grid gap-5 lg:grid-cols-5 lg:gap-6">
      <div className={cn(cardBase, 'flex flex-col p-6 md:p-8 lg:col-span-3')}>
        <OrangeLabel>{featured.label}</OrangeLabel>
        <h3 className="mt-4 text-xl font-semibold text-white">{featured.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary md:text-base">
          {featured.description}
        </p>
        <div className="mt-6 border-t border-border-subtle pt-6">
          <BulletRows items={featured.bullets} />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:col-span-2">
        {rest.map((item) => (
          <div key={item.title} className={cn(cardBase, 'flex flex-1 flex-col p-6')}>
            <OrangeLabel>{item.label}</OrangeLabel>
            <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {item.description}
            </p>
            <BulletRows items={item.bullets} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Split — copy left, divided list right (competitors page pattern). */
export function LandingBenchmarkSplit({
  items,
}: {
  items: { label: string; title: string; description: string }[]
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 lg:items-start">
      <div className="max-w-md lg:sticky lg:top-24">
        <OrangeLabel>Competitors</OrangeLabel>
        <p className="mt-4 text-base leading-relaxed text-text-secondary">
          Track real accounts in your niche, compare{' '}
          <span className="text-text-label">engagement benchmarks</span>, and feed that context
          into every <span className="text-primary">strategy report</span>.
        </p>
      </div>
      <div className="overflow-hidden rounded-[10px] border border-border-subtle">
        {items.map((item, index) => (
          <div
            key={item.title}
            className={cn(
              'bg-surface-card p-6',
              rowHover,
              index > 0 && 'border-t border-border-subtle',
            )}
          >
            <OrangeLabel>{item.label}</OrangeLabel>
            <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Minimal typography — orange rule, no card boxes. */
export function LandingAudienceColumns({
  items,
}: {
  items: { title: string; description: string }[]
}) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 md:gap-8">
      {items.map((item) => (
        <div key={item.title}>
          <div className="mb-5 h-0.5 w-10 bg-primary" aria-hidden />
          <h3 className="text-base font-semibold text-white">{item.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">{item.description}</p>
        </div>
      ))}
    </div>
  )
}

/** Collapsible FAQ — smooth expand, tight rows. */
export function LandingFaqList({
  items,
}: {
  items: { question: string; answer: string }[]
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="divide-y divide-border-subtle overflow-hidden rounded-[10px] border border-border-subtle">
      {items.map((item, index) => {
        const isOpen = openIndex === index

        return (
          <div
            key={item.question}
            className={cn(
              'bg-surface-card transition-colors duration-200',
              isOpen && 'bg-surface-hover',
            )}
          >
            <button
              type="button"
              className={cn(
                'flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-3.5 text-left md:px-6 md:py-4',
                !isOpen && 'hover:bg-surface-hover',
              )}
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <span
                className={cn(
                  'text-sm leading-snug text-white md:text-[15px]',
                  isOpen ? 'font-medium' : 'font-normal',
                )}
              >
                {item.question}
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-300 ease-out',
                  isOpen && 'rotate-180 text-text-secondary',
                )}
                aria-hidden
              />
            </button>

            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-out',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-3.5 text-sm leading-relaxed text-text-secondary md:px-6 md:pb-4">
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
