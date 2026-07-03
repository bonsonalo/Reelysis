'use client'

import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MetricHelpContent } from '@/features/dashboard/constants/metricHelp'

type MetricInfoTipProps = {
  content: MetricHelpContent
  side?: 'top' | 'bottom'
  className?: string
}

export function MetricInfoTip({ content, side = 'bottom', className }: MetricInfoTipProps) {
  return (
    <span className={cn('group/info relative inline-flex shrink-0', className)}>
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-zinc-500 transition-colors hover:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label={`About ${content.title}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 w-52 -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-[11px] leading-snug text-zinc-300 opacity-0 shadow-2xl transition-opacity',
          'invisible group-hover/info:visible group-hover/info:opacity-100 group-focus-within/info:visible group-focus-within/info:opacity-100',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        <span className="mb-0.5 block text-[11px] font-semibold text-white">{content.title}</span>
        {content.body}
      </span>
    </span>
  )
}

export function MetricLabel({
  label,
  help,
  className,
}: {
  label: string
  help?: MetricHelpContent
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span>{label}</span>
      {help && <MetricInfoTip content={help} side="bottom" />}
    </span>
  )
}
