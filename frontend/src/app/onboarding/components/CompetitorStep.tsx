'use client'

import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/shared/Panel'
import { CompetitorAccount } from '@/features/competitors/api'
import { AddCompetitorForm } from '@/features/competitors/components/AddCompetitorForm'
import { CompetitorAvatar } from '@/features/competitors/components/CompetitorAvatar'
import { X } from 'lucide-react'
import { OnboardingStepFrame } from './OnboardingStepFrame'

interface CompetitorStepProps {
  competitors: CompetitorAccount[]
  onRemove: (id: string) => void
  onFinish: () => void
  isFinishing: boolean
}

function formatFollowers(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toLocaleString()
}

export function CompetitorStep({
  competitors,
  onRemove,
  onFinish,
  isFinishing,
}: CompetitorStepProps) {
  return (
    <OnboardingStepFrame className="!items-start sm:!items-center" stage="competitors">
      <div className="w-full max-w-2xl">
        <header className="mb-6 text-center sm:mb-8">
          <h1 className="text-xl font-semibold tracking-[-0.015em] text-foreground">
            Review accounts to track
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-text-secondary">
            {competitors.length > 0
              ? 'These accounts will be your benchmarks. Remove any that don’t fit, or add more by handle below.'
              : 'Add at least one competitor handle to continue.'}
          </p>
        </header>

        <Panel className="mb-6 overflow-hidden">
          <div className="border-b border-border-subtle px-4 py-4 sm:px-6">
            <h3 className="text-sm font-semibold text-foreground">Add competitor</h3>
            <p className="mt-0.5 text-xs text-text-secondary sm:text-sm">
              Track any public account by handle.
            </p>
          </div>
          <div className="px-4 py-4 sm:px-6">
            <AddCompetitorForm />
          </div>
        </Panel>

        {competitors.length > 0 && (
          <Panel className="mb-8 overflow-hidden">
            <div className="border-b border-border-subtle px-4 py-4 sm:px-6">
              <h3 className="text-sm font-semibold text-foreground">Suggested accounts</h3>
              <p className="mt-0.5 text-xs text-text-secondary sm:text-sm">
                {competitors.length} {competitors.length === 1 ? 'account' : 'accounts'} tracked
              </p>
            </div>
            <ul className="divide-y divide-border-subtle">
              {competitors.map((comp) => (
                <li
                  key={comp.id}
                  className="group flex items-center gap-4 px-4 py-3.5 sm:px-6 sm:py-4"
                >
                  <CompetitorAvatar
                    competitorId={comp.id}
                    handle={comp.handle}
                    className="h-10 w-10 shrink-0 rounded-full"
                    iconClassName="h-4 w-4 text-text-tertiary"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">@{comp.handle}</p>
                    <p className="text-xs text-text-secondary">
                      {formatFollowers(comp.followers_count)} followers
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(comp.id)}
                    className="shrink-0 rounded-md p-1.5 text-text-tertiary transition-colors duration-150 hover:bg-danger-tint hover:text-danger"
                    aria-label={`Remove @${comp.handle}`}
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <div className="flex justify-center">
          <Button
            onClick={onFinish}
            disabled={isFinishing || competitors.length === 0}
            size="lg"
            className="w-full sm:w-auto"
          >
            <ButtonLoadingLabel loading={isFinishing} loadingLabel="Generating report…">
              Generate strategy report
            </ButtonLoadingLabel>
          </Button>
        </div>
      </div>
    </OnboardingStepFrame>
  )
}
