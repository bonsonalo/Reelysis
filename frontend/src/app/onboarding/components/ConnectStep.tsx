'use client'

import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'
import { OnboardingStepFrame } from './OnboardingStepFrame'

interface ConnectStepProps {
  onConnect: () => void
  isConnecting: boolean
  errorMessage?: string | null
}

export function ConnectStep({ onConnect, isConnecting, errorMessage }: ConnectStepProps) {
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
        {errorMessage ? (
          <p
            className="mx-auto mt-6 max-w-sm rounded-[10px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-left text-sm leading-relaxed text-red-400"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
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
