import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MetricLabel } from '@/components/shared/MetricInfoTip'
import type { MetricHelpContent } from '@/features/dashboard/constants/metricHelp'

type DashboardStatCardProps = {
  label: string
  help?: MetricHelpContent
  value: string
  change: string
  footerNote?: string
  footerNoteHelp?: MetricHelpContent
  pending?: boolean
  pendingHint?: string
}

function getChangeDirection(change: string) {
  // "+0%", "0%", "+0 pts" are no change, not growth.
  if (/^[+-]?0(\.0+)?(%| pts)?$/.test(change.trim())) return 'flat' as const
  if (change.startsWith('-')) return 'down' as const
  if (
    change.startsWith('+') ||
    (change.endsWith('pts') && change !== '0 pts' && !change.startsWith('0'))
  )
    return 'up' as const
  return 'flat' as const
}

export function DashboardStatCard({
  label,
  help,
  value,
  change,
  footerNote,
  footerNoteHelp,
  pending = false,
  pendingHint,
}: DashboardStatCardProps) {
  const direction = pending ? ('flat' as const) : getChangeDirection(change)

  return (
    <div className="bg-surface-card p-4 sm:p-5">
      <div className="text-[13px] text-text-secondary">
        <MetricLabel label={label} help={help} tipSide="top" />
      </div>
      <p className="mt-2 text-[22px] font-semibold leading-none sm:text-[26px] tracking-[-0.02em] tabular-nums text-foreground">
        {pending ? '—' : value}
      </p>

      {pending ? (
        <p className="mt-3 text-[13px] leading-relaxed text-text-tertiary">{pendingHint}</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p
            className={cn(
              'inline-flex items-center gap-0.5 whitespace-nowrap text-[13px] font-medium tabular-nums',
              direction === 'up' && 'text-success',
              direction === 'down' && 'text-danger',
              direction === 'flat' && 'text-text-secondary',
            )}
          >
            {direction === 'up' && <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />}
            {direction === 'down' && <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
            <span>{change}</span>
            {change.endsWith('%') && (
              <span className="ml-1 font-normal text-text-tertiary">vs. last sync</span>
            )}
          </p>
          {footerNote && (
            <span className="shrink-0 text-[13px] tabular-nums text-text-tertiary">
              <MetricLabel label={footerNote} help={footerNoteHelp} tipSide="top" />
            </span>
          )}
        </div>
      )}
    </div>
  )
}
