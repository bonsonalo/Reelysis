'use client'

import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/shared/Panel'
import { OnboardingStepFrame } from './OnboardingStepFrame'

interface NicheStepProps {
  niche: string
  setNiche: (niche: string) => void
  onConfirm: () => void
  isConfirming: boolean
}

export function NicheStep({ niche, setNiche, onConfirm, isConfirming }: NicheStepProps) {
  return (
    <OnboardingStepFrame narrow>
      <Panel className="overflow-hidden">
        <div className="border-b border-border-subtle px-4 py-4 sm:px-6 md:py-5">
          <h2 className="text-sm font-semibold text-white md:text-base">Your niche</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-text-secondary md:text-sm">
            We grouped your synced Reels and suggest this category. Edit it if
            something looks off.
          </p>
        </div>

        <div className="space-y-6 px-4 py-5 sm:px-6 md:py-6">
          <div className="space-y-2">
            <label htmlFor="niche" className="block text-xs font-medium text-text-label md:text-sm">
              Content niche
            </label>
            <input
              id="niche"
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-border-subtle bg-surface-input px-4 text-sm text-white placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 sm:h-11"
            />
          </div>

          <Button
            onClick={onConfirm}
            disabled={isConfirming || !niche.trim()}
            className="w-full"
            size="lg"
          >
            <ButtonLoadingLabel loading={isConfirming} loadingLabel="Saving…">
              Confirm niche
            </ButtonLoadingLabel>
          </Button>
        </div>
      </Panel>
    </OnboardingStepFrame>
  )
}
