'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useReport } from '@/features/reports/hooks/useReports'
import { useUpdateRecommendation } from '@/features/reports/hooks/useUpdateRecommendation'
import { useGenerateRoadmap } from '@/features/reports/hooks/useGenerateRoadmap'
import { useAnalysisJobById } from '@/features/instagram/hooks/useAnalysisJob'
import { ReportGenerationPanel } from '@/features/reports/components/ReportGenerationPanel'
import { getReportGenerationUi } from '@/features/reports/utils/reportGenerationProgress'
import { Recommendation } from '@/features/reports/api'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { ReportDetailPageSkeleton } from '@/components/shared/PageSkeletons'
import { PageErrorState } from '@/components/shared/PageErrorState'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft, Check, Download, Loader2, Plus } from 'lucide-react'
import Markdown from 'react-markdown'
import { cn, isNotFoundError, parseApiDate } from '@/lib/utils'

const FILTER_OPTIONS = ['all', 'pending', 'completed'] as const
type FilterOption = (typeof FILTER_OPTIONS)[number]

function formatRecommendationType(type: string) {
  return type.replace(/_/g, ' ')
}

export default function ReportDetailPage() {
  const params = useParams()
  const reportId = params.id as string
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: report, isLoading, error, isRefetching, refetch } = useReport(reportId)
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

  // isGenerating is derived from the job status, so nothing needs resetting here.
  useEffect(() => {
    if (pendingJob?.status !== 'succeeded') return
    queryClient.invalidateQueries({ queryKey: ['reports'] })
    router.push('/reports')
  }, [pendingJob?.status, queryClient, router])

  const handleToggleRecommendation = (id: string) => {
    setUpdatingId(id)
    updateRecommendation(id, {
      onSettled: () => setUpdatingId(null),
    })
  }

  if (isLoading) {
    return <ReportDetailPageSkeleton />
  }

  if (error && !isNotFoundError(error)) {
    return (
      <PageErrorState
        title="Couldn’t load this report"
        onRetry={() => refetch()}
        retrying={isRefetching}
      />
    )
  }

  if (!report) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-text-placeholder" />
        <h2 className="text-base font-semibold text-foreground">Report not found</h2>
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
  const reportDate = parseApiDate(report.created_at).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="print-report space-y-6 pb-16 md:space-y-8 md:pb-20">
      <header className="border-b border-border-subtle pb-6 md:pb-8">
        <Link
          href="/reports"
          className="print:hidden mb-5 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors duration-150 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All reports
        </Link>

        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 max-w-3xl">
            <p className="text-xs text-text-tertiary md:text-sm">{reportDate}</p>
            <h1 className="mt-1 text-lg font-semibold text-foreground md:text-2xl">{report.title}</h1>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary md:mt-4 md:text-sm md:leading-relaxed lg:text-base">
              {report.summary}
            </p>
          </div>
          <div className="print:hidden flex w-full shrink-0 flex-col gap-2 sm:flex-row md:w-auto">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="w-full md:w-auto"
              title="Opens the print dialog — choose “Save as PDF”"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button
              onClick={() =>
                generateReport(undefined, {
                  onSuccess: (data) => {
                    if (data?.job_id) setPendingJobId(String(data.job_id))
                  },
                })
              }
              disabled={isGenerating || isStarting}
              className="w-full md:w-auto"
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
        </div>
      </header>

      {(isGenerating || isStarting) && (
        <div className="print:hidden">
          <ReportGenerationPanel
            reportUi={getReportGenerationUi(
              pendingJob?.progress ?? 0,
              pendingJob?.status ?? 'queued',
            )}
            errorMessage={
              pendingJob?.status === 'failed' ? pendingJob.error_message : undefined
            }
          />
        </div>
      )}

      <div className="max-w-[860px] space-y-10 print:block">
        <section className="space-y-3 md:space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground md:text-base">Action items</h2>
              <p className="mt-0.5 text-xs text-text-secondary md:mt-1 md:text-sm">
                {pendingCount} to do, {completedCount} done
              </p>
            </div>
            <div className="print:hidden inline-flex max-w-full overflow-x-auto rounded-lg bg-surface-hover p-0.5 md:overflow-visible">
              {FILTER_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs capitalize transition-colors duration-150 md:px-3 md:py-1.5 md:text-sm',
                    filter === value
                      ? 'bg-white font-medium text-foreground shadow-raised'
                      : 'text-text-secondary hover:text-foreground',
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
                <Check className="mb-3 h-8 w-8 text-text-placeholder" />
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
                        'print-avoid-break flex gap-3 px-3.5 py-3 transition-colors duration-150 md:gap-4 md:px-5 md:py-5 lg:px-6',
                        isCompleted && 'bg-surface-hover',
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
                            ? 'border-green-300 bg-success-tint text-success hover:border-green-400'
                            : 'border-border-strong bg-transparent text-transparent hover:border-border-strong hover:bg-surface-hover',
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
                            <span className="text-xs text-danger">High priority</span>
                          )}
                        </div>
                        <h3
                          className={cn(
                            'mt-1 text-xs font-semibold leading-snug md:text-base',
                            isCompleted ? 'text-text-secondary line-through' : 'text-foreground',
                          )}
                        >
                          {item.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-text-secondary md:mt-2 md:text-sm">
                          {item.description}
                        </p>
                        {item.evidence && (
                          <p className="mt-2 text-xs leading-relaxed text-text-tertiary md:mt-3 md:text-sm">
                            <span className="text-text-label">Evidence: </span>
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

        <section className="space-y-3 md:space-y-4 print:mt-8">
          <div>
            <h2 className="text-sm font-semibold text-foreground md:text-base">Full report</h2>
            <p className="mt-0.5 text-xs text-text-secondary md:mt-1 md:text-sm">
              Complete strategy write-up
            </p>
          </div>
          <Panel className="print-scroll-reset p-5 md:p-8">
            <div className="prose prose-sm max-w-[68ch] md:prose-base prose-headings:font-semibold prose-headings:tracking-[-0.01em] prose-h1:text-xl prose-h1:mb-3 prose-h2:text-base prose-h3:text-[15px] prose-li:marker:text-text-placeholder prose-headings:text-foreground prose-p:text-text-secondary prose-li:text-text-secondary prose-strong:text-text-label prose-a:text-brand-text">
              <Markdown>{report.report_markdown}</Markdown>
            </div>
          </Panel>
        </section>
      </div>
    </div>
  )
}
