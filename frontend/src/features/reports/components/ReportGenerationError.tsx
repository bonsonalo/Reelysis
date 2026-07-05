'use client'

import { AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { cn } from '@/lib/utils'

type ReportGenerationErrorProps = {
  message?: string | null
  onRetry: () => void
  retrying?: boolean
}

type ErrorInfo = {
  title: string
  description: string
  tone: 'error' | 'limit'
  canRetry: boolean
}

function interpretError(message?: string | null): ErrorInfo {
  const text = (message ?? '').toLowerCase()

  if (
    text.includes('final report') &&
    text.includes('tomorrow') &&
    (text.includes('budget') || text.includes('quota'))
  ) {
    return {
      title: 'Almost there',
      description:
        'Your videos were analyzed, but we ran out of AI capacity before writing the report. Those analyses are saved. Try again tomorrow and it should finish quickly.',
      tone: 'limit',
      canRetry: false,
    }
  }
  if (
    text.includes('daily quota') ||
    text.includes('daily limit') ||
    text.includes('no gemini budget left today') ||
    (text.includes('tomorrow') && (text.includes('quota') || text.includes('budget')))
  ) {
    return {
      title: 'Daily AI limit reached',
      description:
        "You've reached today's limit for AI report generation. It resets tomorrow, so check back then to finish your report.",
      tone: 'limit',
      canRetry: false,
    }
  }
  if (text.includes('timed out') || text.includes('timeout')) {
    return {
      title: 'This took too long',
      description: 'The report ran longer than expected and stopped. Trying again usually resolves it.',
      tone: 'error',
      canRetry: true,
    }
  }
  if (
    text.includes('503') ||
    text.includes('unavailable') ||
    text.includes('high demand') ||
    text.includes('try again in a few minutes')
  ) {
    return {
      title: 'AI is under heavy load',
      description: 'Gemini hit a temporary capacity spike. Wait a few minutes, then try again.',
      tone: 'error',
      canRetry: true,
    }
  }
  if (
    text.includes('429') ||
    text.includes('rate limit') ||
    text.includes('per minute') ||
    text.includes('perminute') ||
    text.includes('too many requests per minute')
  ) {
    return {
      title: 'Too many requests at once',
      description: 'Wait about a minute, then try again.',
      tone: 'error',
      canRetry: true,
    }
  }
  return {
    title: 'Report generation failed',
    description: 'Something went wrong while generating your report. Please try again.',
    tone: 'error',
    canRetry: true,
  }
}

export function ReportGenerationError({
  message,
  onRetry,
  retrying,
}: ReportGenerationErrorProps) {
  const info = interpretError(message)
  const Icon = info.tone === 'limit' ? Clock : AlertTriangle

  return (
    <section className="max-w-2xl py-2 md:py-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
            info.tone === 'limit' ? 'bg-amber-500/10' : 'bg-red-500/10',
          )}
          aria-hidden
        >
          <Icon
            className={cn('h-3 w-3', info.tone === 'limit' ? 'text-amber-400' : 'text-red-400')}
          />
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-white md:text-[15px]">{info.title}</p>
          <p className="text-sm leading-relaxed text-text-secondary">{info.description}</p>
          {info.canRetry && (
            <div className="pt-1">
              <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying}>
                <ButtonLoadingLabel loading={retrying} loadingLabel="Retrying…">
                  Try again
                </ButtonLoadingLabel>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
