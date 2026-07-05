import {
  phaseStatus,
  type ProgressTask,
  type ProgressTaskStatus,
} from '@/features/jobs/utils/jobProgressUtils'

export type { ProgressTask, ProgressTaskStatus }

const PHASES = [
  { start: 0, end: 55, label: 'Pulling competitor profiles and Reels' },
  { start: 55, end: 82, label: 'Analyzing your videos' },
  { start: 82, end: 88, label: 'Benchmarking against competitors' },
  { start: 88, end: 100, label: 'Writing your growth strategy' },
] as const

export function getReportGenerationUi(progress: number, status: string | undefined) {
  const jobStatus = status ?? 'queued'
  const pct = jobStatus === 'succeeded' ? 100 : Math.min(100, Math.max(0, progress))

  const tasks: ProgressTask[] = PHASES.map(({ start, end, label }) => ({
    label,
    status: phaseStatus(pct, start, end, jobStatus),
  }))

  const runningTask = tasks.find((t) => t.status === 'running')

  let description = 'Working on your report'

  if (jobStatus === 'failed') {
    description = 'Report generation failed'
  } else if (jobStatus === 'succeeded') {
    description = 'Your report is ready'
  } else if (runningTask) {
    description = runningTask.label
  } else if (jobStatus === 'queued') {
    description = 'Starting'
  }

  return { tasks, description, progressPercent: pct }
}
