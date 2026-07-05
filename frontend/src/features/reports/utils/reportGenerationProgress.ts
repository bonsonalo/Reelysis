import {
  phaseStatus,
  type ProgressTask,
  type ProgressTaskStatus,
} from '@/features/jobs/utils/jobProgressUtils'

export type { ProgressTask, ProgressTaskStatus }

export function getReportGenerationUi(progress: number, status: string | undefined) {
  const jobStatus = status ?? 'queued'
  const pct = jobStatus === 'succeeded' ? 100 : Math.min(100, Math.max(0, progress))

  const tasks: ProgressTask[] = [
    {
      label: 'Refreshing competitor profiles and Reels',
      status: phaseStatus(pct, 0, 55, jobStatus),
    },
    {
      label: 'Transcribing and analyzing videos',
      status: phaseStatus(pct, 55, 82, jobStatus),
    },
    {
      label: 'Comparing your content to the market',
      status: phaseStatus(pct, 82, 88, jobStatus),
    },
    {
      label: 'Writing your growth strategy',
      status: phaseStatus(pct, 88, 100, jobStatus),
    },
  ]

  const runningTask = tasks.find((t) => t.status === 'running')

  let description =
    'This can take several minutes the first time. We fetch competitor data, analyze videos, then write your report.'

  if (jobStatus === 'failed') {
    description = 'Report generation hit an error. You can retry or continue to the dashboard.'
  } else if (jobStatus === 'succeeded') {
    description = 'Your strategy report is ready.'
  } else if (runningTask) {
    description = `${runningTask.label}…`
  } else if (jobStatus === 'queued') {
    description = 'Starting report generation…'
  }

  return { tasks, description, progressPercent: pct }
}
