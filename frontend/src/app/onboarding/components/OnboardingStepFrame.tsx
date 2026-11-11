import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type OnboardingStage = 'connect' | 'niche' | 'competitors' | 'report'

const STAGES: { id: OnboardingStage; label: string }[] = [
  { id: 'connect', label: 'Connect' },
  { id: 'niche', label: 'Niche' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'report', label: 'Report' },
]

type OnboardingStepFrameProps = {
  children: React.ReactNode
  className?: string
  narrow?: boolean
  /** Where this screen sits in setup; omit on the final screen. */
  stage?: OnboardingStage
}

function OnboardingProgress({ stage }: { stage: OnboardingStage }) {
  const current = STAGES.findIndex((s) => s.id === stage)

  return (
    <ol className="mb-8 flex items-center justify-center gap-2 text-[13px]" aria-label="Setup progress">
      {STAGES.map((s, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={s.id} className="flex items-center gap-2">
            {index > 0 && (
              <span
                className={cn('h-px w-4 sm:w-8', done || active ? 'bg-foreground/40' : 'bg-border-strong')}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                done && 'bg-foreground text-white',
                active && 'bg-primary text-white',
                !done && !active && 'border border-border-strong bg-white text-text-tertiary',
              )}
              aria-hidden
            >
              {done ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
            </span>
            <span
              className={cn(
                'hidden sm:inline',
                active ? 'font-medium text-foreground' : 'text-text-tertiary',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {s.label}
              {done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function OnboardingStepFrame({
  children,
  className,
  narrow = false,
  stage,
}: OnboardingStepFrameProps) {
  return (
    <div
      className={cn(
        'flex min-h-[calc(100dvh-3.5rem)] w-full flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12',
        className,
      )}
    >
      <div className={cn('w-full', narrow ? 'max-w-[440px]' : 'max-w-2xl')}>
        {stage && <OnboardingProgress stage={stage} />}
        {children}
      </div>
    </div>
  )
}

/** White card for a single onboarding screen, matching the sign-in card. */
export function OnboardingCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border-subtle bg-white p-6 shadow-overlay sm:p-8',
        className,
      )}
    >
      {children}
    </div>
  )
}
