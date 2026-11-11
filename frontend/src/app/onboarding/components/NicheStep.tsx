'use client'

import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/shared/Panel'
import { OnboardingStepFrame } from './OnboardingStepFrame'
import { inputClassName } from '@/components/auth/AuthField'

interface NicheStepProps {
  niche: string
  setNiche: (niche: string) => void
  onConfirm: () => void
  isConfirming: boolean
}

export function NicheStep({ niche, setNiche, onConfirm, isConfirming }: NicheStepProps) {
  return (
    <OnboardingStepFrame narrow stage="niche">
      <Panel className="overflow-hidden shadow-overlay">
        <div className="border-b border-border-subtle px-4 py-4 sm:px-6 md:py-5">
          <h2 className="text-sm font-semibold text-foreground md:text-base">Your niche</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-text-secondary md:text-sm">
            We grouped your synced Reels and suggest this category. Edit it if
            something looks off.
          </p>
        </div>

        <div className="space-y-6 px-4 py-5 sm:px-6 md:py-6">
          <div className="space-y-1.5">
            <label htmlFor="niche" className="block text-[13px] font-medium text-text-label">
              Content niche
            </label>
            <input
              id="niche"
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className={inputClassName}
            />
          </div>

          <Button
            onClick={onConfirm}
            disabled={isConfirming || !niche.trim()}
            className="h-10 w-full"
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
