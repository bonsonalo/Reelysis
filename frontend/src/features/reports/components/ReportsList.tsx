'use client'

import Link from 'next/link'
import { ChevronRight, FileText } from 'lucide-react'
import { Panel } from '@/components/shared/Panel'
import { parseApiDate } from '@/lib/utils'
import type { ReportListItem } from '@/features/reports/api'

type ReportsListProps = {
  reports: ReportListItem[]
}

function formatDate(createdAt: string) {
  return parseApiDate(createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRelativeDate(createdAt: string) {
  const date = parseApiDate(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} wk ago`
  return formatDate(createdAt)
}

export function ReportsList({ reports }: ReportsListProps) {
  const [latest, ...previous] = reports

  return (
    <div className="space-y-4 md:space-y-6">
      <Panel className="overflow-hidden">
        <Link
          href={`/reports/${latest.id}`}
          className="group block p-3.5 transition-colors duration-150 hover:bg-surface-hover focus-visible:bg-surface-hover md:p-6"
        >
          {/* Mobile: compact row layout */}
          <div className="flex items-start justify-between gap-3 md:hidden">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                Latest report
              </div>
              <h2 className="mt-1.5 text-base font-semibold leading-snug text-foreground">
                {latest.title}
              </h2>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                {latest.summary}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium text-text-label">
                {formatRelativeDate(latest.created_at)}
              </p>
            </div>
          </div>

          {/* md+: featured layout — slightly tighter than before */}
          <div className="hidden flex-col gap-5 md:flex md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                Latest report
              </div>
              <div>
                <h2 className="text-xl font-semibold leading-snug text-foreground">
                  {latest.title}
                </h2>
                <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-text-secondary">
                  {latest.summary}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-left md:text-right">
              <p className="text-sm font-medium text-text-label">
                {formatRelativeDate(latest.created_at)}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">{formatDate(latest.created_at)}</p>
            </div>
          </div>
        </Link>
      </Panel>

      {previous.length > 0 && (
        <Panel className="overflow-hidden">
          <div className="border-b border-border-subtle px-3.5 py-3 md:px-6 md:py-4">
            <h2 className="text-sm font-semibold text-foreground md:text-base">Previous reports</h2>
            <p className="mt-0.5 text-xs text-text-secondary md:mt-1 md:text-sm">
              {previous.length} earlier {previous.length === 1 ? 'report' : 'reports'}
            </p>
          </div>

          <div className="hidden grid-cols-[minmax(220px,1.2fr)_minmax(0,2fr)_120px_28px] gap-4 border-b border-border-subtle px-6 py-3 text-xs font-medium text-text-tertiary md:grid">
            <span>Report</span>
            <span>Summary</span>
            <span className="text-right">Generated</span>
            <span className="sr-only">Open</span>
          </div>

          <div className="divide-y divide-border-subtle">
            {previous.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="group block transition-colors duration-150 hover:bg-surface-hover focus-visible:bg-surface-hover"
              >
                {/* Mobile: compact row */}
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 md:hidden">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{report.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">
                      {report.summary}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <p className="text-xs tabular-nums text-text-tertiary">
                      {formatDate(report.created_at)}
                    </p>
                    <ChevronRight className="h-4 w-4 text-text-placeholder transition-colors duration-150 group-hover:text-text-secondary" />
                  </div>
                </div>

                {/* md+: original table row */}
                <div className="hidden grid-cols-[minmax(220px,1.2fr)_minmax(0,2fr)_120px_28px] items-center gap-4 px-6 py-4 md:grid">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0 text-text-tertiary" />
                    <p className="truncate font-medium text-foreground">{report.title}</p>
                  </div>
                  <p className="line-clamp-1 text-sm text-text-secondary md:pr-4">
                    {report.summary}
                  </p>
                  <p className="text-sm tabular-nums text-text-tertiary md:text-right">
                    {formatDate(report.created_at)}
                  </p>
                  <ChevronRight className="h-4 w-4 text-text-placeholder transition-colors duration-150 group-hover:text-text-secondary" />
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
