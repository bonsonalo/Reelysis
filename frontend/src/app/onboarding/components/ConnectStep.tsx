'use client'

import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { OnboardingCard, OnboardingStepFrame } from './OnboardingStepFrame'

const WHAT_HAPPENS = [
  'Your recent Reels, captions and metrics are imported',
  'Your content niche is detected from your captions',
  'Accounts in your niche are suggested as competitors',
]

interface ConnectStepProps {
  onConnect: () => void
  isConnecting: boolean
  errorMessage?: string | null
}

export function ConnectStep({ onConnect, isConnecting, errorMessage }: ConnectStepProps) {
  return (
    <OnboardingStepFrame narrow stage="connect">
      <OnboardingCard>
        <h1 className="text-xl font-semibold tracking-[-0.015em] text-foreground">
          Connect your Instagram
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
          Reelysis reads your Reels through Instagram&apos;s official API. You approve access on
          Instagram and come straight back here.
        </p>

        <ul className="mt-6 space-y-3 border-t border-border-subtle pt-5 text-sm">
          {WHAT_HAPPENS.map((item) => (
            <li key={item} className="flex gap-3 text-text-label">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              {item}
            </li>
          ))}
        </ul>

        {errorMessage ? (
          <p
            className="mt-6 rounded-md border border-red-200 bg-danger-tint px-3 py-2.5 text-sm leading-relaxed text-danger"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <Button onClick={onConnect} disabled={isConnecting} className="mt-6 h-10 w-full">
          <ButtonLoadingLabel loading={isConnecting} loadingLabel="Connecting…">
            Connect Instagram
          </ButtonLoadingLabel>
        </Button>
        <p className="mt-3 text-center text-[13px] text-text-tertiary">
          Needs an Instagram Business or Creator account.
        </p>
      </OnboardingCard>
    </OnboardingStepFrame>
  )
}
