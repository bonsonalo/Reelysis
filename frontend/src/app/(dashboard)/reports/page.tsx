'use client'

import { useEffect, useRef, useState } from 'react'
import { useReports } from '@/features/reports/hooks/useReports'
import { useGenerateRoadmap } from '@/features/reports/hooks/useGenerateRoadmap'
import { useAnalysisJob, useAnalysisJobById } from '@/features/instagram/hooks/useAnalysisJob'
import { getReportGenerationUi } from '@/features/reports/utils/reportGenerationProgress'
import { ReportGenerationPanel } from '@/features/reports/components/ReportGenerationPanel'
import { ReportGenerationError } from '@/features/reports/components/ReportGenerationError'
import { ReportsList } from '@/features/reports/components/ReportsList'
import { ReportsEmptyState } from '@/features/reports/components/ReportsEmptyState'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { ReportsPageSkeleton } from '@/components/shared/PageSkeletons'
import { PageErrorState } from '@/components/shared/PageErrorState'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ReportsPage() {
  const { data: reports, isLoading, isError, isRefetching, refetch } = useReports()
  const { mutate: generateReport, isPending: isStarting } = useGenerateRoadmap()
  const [pendingJobId, setPendingJobId] = useState<string | null>(null)
  const completedJobIdRef = useRef<string | null>(null)

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

  const { data: lastReportJob, refetch: refetchLastReportJob } = useAnalysisJob(
    'report_generation',
    { enabled: !isGenerating && !isStarting },
  )

  useEffect(() => {
    if (!pendingJobId || !pendingJob) return
    const isDone = pendingJob.status === 'succeeded' || pendingJob.status === 'failed'
    if (!isDone || completedJobIdRef.current === pendingJobId) return
    completedJobIdRef.current = pendingJobId
    refetch()
    refetchLastReportJob()
    setPendingJobId(null)
  }, [pendingJobId, pendingJob, refetch, refetchLastReportJob])

  const handleGenerate = () => {
    if (isGenerating || isStarting) return
    generateReport(undefined, {
      onSuccess: (data) => {
        if (data?.job_id) {
          setPendingJobId(String(data.job_id))
        }
      },
    })
  }

  if (isLoading) {
    return <ReportsPageSkeleton />
  }

  if (isError && !reports) {
    return (
      <PageErrorState
        title="Couldn’t load reports"
        onRetry={() => refetch()}
        retrying={isRefetching}
      />
    )
  }

  const reportCount = reports?.length ?? 0
  const generating = isGenerating || isStarting

  const latestReportTime = reports?.[0]?.created_at
    ? new Date(reports[0].created_at).getTime()
    : 0
  const lastJobTime = lastReportJob?.completed_at
    ? new Date(lastReportJob.completed_at).getTime()
    : lastReportJob?.created_at
      ? new Date(lastReportJob.created_at).getTime()
      : 0
  const showFailure =
    !generating &&
    lastReportJob?.status === 'failed' &&
    lastJobTime >= latestReportTime

  return (
    <div className="space-y-6 pb-16 md:space-y-8 md:pb-20">
      <header className="flex flex-col justify-between gap-4 border-b border-border-subtle pb-6 md:flex-row md:items-end md:gap-6 md:pb-8">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-lg font-semibold text-white md:text-2xl">Reports</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-text-secondary md:mt-2 md:text-sm">
            Strategy write-ups from your Reels and competitor data. Each report compares
            your content, surfaces gaps, and suggests what to post next.
          </p>
          {reportCount > 0 && (
            <p className="mt-2 text-xs text-text-tertiary md:mt-3 md:text-sm">
              {reportCount} {reportCount === 1 ? 'report' : 'reports'} generated
            </p>
          )}
        </div>
        <Button
          onClick={handleGenerate}
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
      </header>

      {generating && (
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

      {!generating && showFailure && (
        <ReportGenerationError
          message={lastReportJob?.error_message}
          onRetry={handleGenerate}
          retrying={isStarting}
        />
      )}

      {!generating && reportCount > 0 && <ReportsList reports={reports!} />}

      {!generating && reportCount === 0 && !showFailure && <ReportsEmptyState />}
    </div>
  )
}
