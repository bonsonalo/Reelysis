'use client'

import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/shared/Panel'
import { CompetitorAccount } from '@/features/competitors/api'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { AddCompetitorForm } from '@/features/competitors/components/AddCompetitorForm'
import { CompetitorAvatar } from '@/features/competitors/components/CompetitorAvatar'
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
  const [selectedIds, setSelectedIds] = useState<string[]>(competitors.map((c) => c.id))

  useEffect(() => {
    setSelectedIds((prev) => {
      const allIds = competitors.map((c) => c.id)
      if (allIds.length === 0) return []
      const kept = prev.filter((id) => allIds.includes(id))
      const added = allIds.filter((id) => !kept.includes(id))
      return [...kept, ...added]
    })
  }, [competitors])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  return (
    <OnboardingStepFrame className="!items-start sm:!items-center">
      <div className="w-full max-w-2xl">
        <header className="mb-6 text-center sm:mb-8">
          <h2 className="text-lg font-semibold text-white sm:text-xl">
            Choose accounts to track
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-text-secondary">
            {competitors.length > 0
              ? 'Select accounts for your benchmarks, or add more by handle below.'
              : 'Add at least one competitor handle to continue.'}
          </p>
        </header>

        <Panel className="mb-6 overflow-hidden">
          <div className="border-b border-border-subtle px-4 py-4 sm:px-6">
            <h3 className="text-sm font-semibold text-white">Add competitor</h3>
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
              <h3 className="text-sm font-semibold text-white">Suggested accounts</h3>
              <p className="mt-0.5 text-xs text-text-secondary sm:text-sm">
                {selectedIds.length} of {competitors.length} selected
              </p>
            </div>
            <ul className="divide-y divide-border-subtle">
              {competitors.map((comp) => {
                const isSelected = selectedIds.includes(comp.id)
                return (
                  <li key={comp.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSelect(comp.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleSelect(comp.id)
                        }
                      }}
                      className={cn(
                        'group flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors duration-150 sm:px-6 sm:py-4',
                        isSelected ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                          isSelected
                            ? 'border-primary bg-primary text-white'
                            : 'border-border-subtle bg-surface-input',
                        )}
                        aria-hidden
                      >
                        {isSelected && (
                          <span className="text-[10px] font-semibold leading-none">✓</span>
                        )}
                      </div>

                      <CompetitorAvatar
                        competitorId={comp.id}
                        handle={comp.handle}
                        className="h-10 w-10 shrink-0 rounded-full"
                        iconClassName="h-4 w-4 text-text-tertiary"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          @{comp.handle}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {formatFollowers(comp.followers_count)} followers
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemove(comp.id)
                        }}
                        className="shrink-0 text-xs text-text-secondary transition-colors duration-150 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>
        )}

        <div className="flex justify-center">
          <Button
            onClick={onFinish}
            disabled={isFinishing || selectedIds.length === 0}
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
