import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MetricLabel } from '@/components/shared/MetricInfoTip'
import { Panel } from '@/components/shared/Panel'
import type { MetricHelpContent } from '@/features/dashboard/constants/metricHelp'

type DashboardStatCardProps = {
  label: string
  help?: MetricHelpContent
  value: string
  change: string
  footerNote?: string
  footerNoteHelp?: MetricHelpContent
  icon: LucideIcon
}

function getChangeDirection(change: string) {
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
  icon: Icon,
}: DashboardStatCardProps) {
  const direction = getChangeDirection(change)

  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm text-text-label">
            <MetricLabel label={label} help={help} tipSide="top" />
          </div>
          <p className="mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums text-white sm:text-3xl">
            {value}
          </p>
        </div>
        <Icon className="h-4 w-4 shrink-0 text-text-tertiary" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p
          className={cn(
            'inline-flex items-center gap-1 text-sm font-medium',
            direction === 'up' && 'text-emerald-400',
            direction === 'down' && 'text-red-400',
            direction === 'flat' && 'text-text-secondary',
          )}
        >
          {direction === 'up' && <TrendingUp className="h-3 w-3" />}
          {direction === 'down' && <TrendingDown className="h-3 w-3" />}
          <span>{change}</span>
        </p>
        {footerNote && (
          <span className="shrink-0 text-sm tabular-nums text-text-secondary">
            <MetricLabel label={footerNote} help={footerNoteHelp} tipSide="top" />
          </span>
        )}
      </div>
    </Panel>
  )
}
