'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useReport } from '@/features/reports/hooks/useLatestReport'
import { useUpdateRecommendation } from '@/features/reports/hooks/useUpdateRecommendation'
import { useGenerateRoadmap } from '@/features/reports/hooks/useGenerateRoadmap'
import { useAnalysisJobById } from '@/features/instagram/hooks/useAnalysisJob'
import { ReportGenerationPanel } from '@/features/reports/components/ReportGenerationPanel'
import { getReportGenerationUi } from '@/features/reports/utils/reportGenerationProgress'
import { Recommendation } from '@/features/reports/api'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { ReportDetailPageSkeleton } from '@/components/shared/PageSkeletons'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft, Check, Loader2, Plus } from 'lucide-react'
import Markdown from 'react-markdown'
import { cn } from '@/lib/utils'

const FILTER_OPTIONS = ['all', 'pending', 'completed'] as const
type FilterOption = (typeof FILTER_OPTIONS)[number]

function formatRecommendationType(type: string) {
  return type.replace(/_/g, ' ')
}

export default function ReportDetailPage() {
  const params = useParams()
  const reportId = params.id as string

  const { data: report, isLoading } = useReport(reportId)
  const { mutate: updateRecommendation, isPending: isUpdating } = useUpdateRecommendation()
  const { mutate: generateReport, isPending: isStarting } = useGenerateRoadmap()
  const [pendingJobId, setPendingJobId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const pollWhileActive = (query: { state: { data?: { status?: string } | null } }) => {
    const status = query.state.data?.status
    return status === 'queued' || status === 'running' ? 3000 : false
  }

  const { data: pendingJob } = useAnalysisJobById(pendingJobId, {
    refetchInterval: pollWhileActive,
  })

  const isGenerating =
    !!pendingJobId &&
    (!pendingJob || pendingJob.status === 'queued' || pendingJob.status === 'running')

  const [filter, setFilter] = useState<FilterOption>('all')

  useEffect(() => {
    if (!pendingJob) return
    if (pendingJob.status === 'succeeded') {
      setPendingJobId(null)
      window.location.href = '/reports'
    }
    if (pendingJob.status === 'failed') {
      setPendingJobId(null)
    }
  }, [pendingJob?.status, pendingJob])

  const handleToggleRecommendation = (id: string) => {
    setUpdatingId(id)
    updateRecommendation(id, {
      onSettled: () => setUpdatingId(null),
    })
  }

  if (isLoading) {
    return <ReportDetailPageSkeleton />
  }

  if (!report) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-zinc-600" />
        <h2 className="text-base font-semibold text-white">Report not found</h2>
        <Link href="/reports" className="mt-6">
          <Button>Back to reports</Button>
        </Link>
      </div>
    )
  }

  const recommendations = (report.recommendations as Recommendation[]) || []
  const filteredRecommendations = recommendations.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'pending') return item.status === 'pending'
    if (filter === 'completed') return item.status === 'completed'
    return true
  })

  const pendingCount = recommendations.filter((r) => r.status === 'pending').length
  const completedCount = recommendations.filter((r) => r.status === 'completed').length
  const reportDate = new Date(report.created_at).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="space-y-6 pb-16 md:space-y-8 md:pb-20">
      <header className="border-b border-border-subtle pb-6 md:pb-8">
        <Link
          href="/reports"
          className="mb-5 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors duration-150 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All reports
        </Link>

        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 max-w-3xl">
            <p className="text-xs text-text-tertiary md:text-sm">{reportDate}</p>
            <h1 className="mt-1 text-lg font-semibold text-white md:text-2xl">{report.title}</h1>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary md:mt-4 md:text-sm md:leading-relaxed lg:text-base">
              {report.summary}
            </p>
          </div>
          <Button
            onClick={() =>
              generateReport(undefined, {
                onSuccess: (data) => {
                  if (data?.job_id) setPendingJobId(String(data.job_id))
                },
              })
            }
            disabled={isGenerating || isStarting}
            className="w-full shrink-0 md:w-auto"
          >
            <ButtonLoadingLabel
              loading={isGenerating || isStarting}
              loadingLabel="Generating…"
            >
              <>
                <Plus className="h-4 w-4" />
                Generate report
              </>
            </ButtonLoadingLabel>
          </Button>
        </div>
      </header>

      {(isGenerating || isStarting) && (
        <ReportGenerationPanel
          reportUi={getReportGenerationUi(
            pendingJob?.progress ?? 0,
            pendingJob?.status ?? 'queued',
          )}
          errorMessage={
            pendingJob?.status === 'failed' ? pendingJob.error_message : undefined
          }
        />
      )}

      <div className="grid grid-cols-1 gap-5 md:gap-8 xl:grid-cols-5 xl:gap-10">
        <section className="space-y-3 md:space-y-5 xl:col-span-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white md:text-base">Action items</h2>
              <p className="mt-0.5 text-xs text-text-secondary md:mt-1 md:text-sm">
                {pendingCount} to do · {completedCount} done
              </p>
            </div>
            <div className="inline-flex max-w-full overflow-x-auto rounded-[10px] border border-border-subtle bg-surface-input p-0.5 md:overflow-visible">
              {FILTER_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs capitalize transition-colors duration-150 md:px-3 md:py-1.5 md:text-sm',
                    filter === value
                      ? 'bg-white/[0.08] text-white'
                      : 'text-text-secondary hover:text-white',
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <Panel className="overflow-hidden">
            {filteredRecommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <Check className="mb-3 h-8 w-8 text-zinc-600" />
                <p className="text-sm text-text-secondary">
                  No recommendations match this filter.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {filteredRecommendations.map((item) => {
                  const isCompleted = item.status === 'completed'
                  const isUpdatingThis = isUpdating && updatingId === item.id

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex gap-3 px-3.5 py-3 transition-colors duration-150 md:gap-4 md:px-5 md:py-5 lg:px-6',
                        isCompleted && 'bg-white/[0.01]',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleRecommendation(item.id)}
                        disabled={isUpdatingThis}
                        title={isCompleted ? 'Mark as pending' : 'Mark as done'}
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-[color,background-color,border-color] duration-150',
                          isCompleted
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:border-emerald-500/60'
                            : 'border-zinc-600 bg-transparent text-transparent hover:border-zinc-500 hover:bg-white/[0.04]',
                        )}
                      >
                        {isUpdatingThis ? (
                          <Loader2 className="h-3 w-3 animate-spin text-text-secondary" />
                        ) : isCompleted ? (
                          <Check className="h-3 w-3" />
                        ) : null}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-xs capitalize text-text-tertiary">
                            {formatRecommendationType(item.recommedation_type)}
                          </span>
                          {item.priority >= 4 && !isCompleted && (
                            <span className="text-xs text-red-400">High priority</span>
                          )}
                        </div>
                        <h3
                          className={cn(
                            'mt-1 text-xs font-semibold leading-snug md:text-base',
                            isCompleted ? 'text-text-secondary line-through' : 'text-white',
                          )}
                        >
                          {item.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-text-secondary md:mt-2 md:text-sm">
                          {item.description}
                        </p>
                        {item.evidence && (
                          <p className="mt-2 text-xs leading-relaxed text-text-tertiary md:mt-3 md:text-sm">
                            <span className="text-text-label">Evidence · </span>
                            {item.evidence}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </section>

        <section className="space-y-3 md:space-y-5 xl:col-span-2">
          <div>
            <h2 className="text-sm font-semibold text-white md:text-base">Full report</h2>
            <p className="mt-0.5 text-xs text-text-secondary md:mt-1 md:text-sm">
              Complete strategy write-up
            </p>
          </div>
          <Panel className="max-h-[min(720px,calc(100dvh-10rem))] overflow-y-auto p-3.5 custom-scrollbar md:max-h-[min(720px,calc(100vh-12rem))] md:p-6 xl:sticky xl:top-8">
            <div className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-headings:text-white prose-p:text-text-secondary prose-li:text-text-secondary prose-strong:text-text-label prose-a:text-primary">
              <Markdown>{report.report_markdown}</Markdown>
            </div>
          </Panel>
        </section>
      </div>
    </div>
  )
}
