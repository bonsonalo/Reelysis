'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { AI_INSIGHTS_EMPTY } from '@/features/dashboard/constants/aiInsightsCopy'
import { cn } from '@/lib/utils'

type AiInsightsPendingProps = {
  variant?: 'panel' | 'inline'
  className?: string
}

export function AiInsightsPending({
  variant = 'panel',
  className,
}: AiInsightsPendingProps) {
  if (variant === 'inline') {
    return (
      <p className={cn('text-xs leading-relaxed text-text-secondary md:text-sm', className)}>
        {AI_INSIGHTS_EMPTY.primary}{' '}
        <Link href="/reports" className="text-primary underline-offset-2 hover:underline">
          {AI_INSIGHTS_EMPTY.cta}
        </Link>
      </p>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <PageEmptyState
        primary={AI_INSIGHTS_EMPTY.primary}
        secondary={AI_INSIGHTS_EMPTY.secondary}
        className="py-4 md:py-6"
      />
      <Link href="/reports">
        <Button size="sm" className="w-full sm:w-auto">
          {AI_INSIGHTS_EMPTY.cta}
        </Button>
      </Link>
    </div>
  )
}
