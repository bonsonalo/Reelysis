'use client'

import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'
import { OnboardingStepFrame } from './OnboardingStepFrame'

interface ConnectStepProps {
  onConnect: () => void
  isConnecting: boolean
}

export function ConnectStep({ onConnect, isConnecting }: ConnectStepProps) {
  return (
    <OnboardingStepFrame narrow>
      <div className="text-center">
        <h1 className="text-xl font-semibold text-white sm:text-2xl">
          Connect your Instagram
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
          We&apos;ll import your Reels, detect your niche, and suggest competitors
          to track.
        </p>
        <div className="mt-8">
          <Button size="lg" onClick={onConnect} disabled={isConnecting} className="w-full sm:w-auto">
            <ButtonLoadingLabel loading={isConnecting} loadingLabel="Connecting…">
              Connect Instagram
            </ButtonLoadingLabel>
          </Button>
        </div>
      </div>
    </OnboardingStepFrame>
  )
}
