export type ProgressTaskStatus = 'pending' | 'running' | 'completed'

export type ProgressTask = {
  label: string
  status: ProgressTaskStatus
}

function phaseStatus(progress: number, start: number, end: number, jobStatus: string): ProgressTaskStatus {
  if (jobStatus === 'succeeded') return 'completed'
  if (jobStatus === 'failed' || jobStatus === 'queued') {
    if (jobStatus === 'queued' && start === 0) return 'running'
    if (jobStatus === 'queued') return 'pending'
    return progress >= end ? 'completed' : progress >= start ? 'running' : 'pending'
  }
  if (progress >= end) return 'completed'
  if (progress >= start) return 'running'
  return 'pending'
}

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
    'This can take several minutes the first time — we fetch competitor data, analyze videos, then write your report.'

  if (jobStatus === 'failed') {
    description = 'Report generation hit an error. You can retry or skip and continue to the dashboard.'
  } else if (jobStatus === 'succeeded') {
    description = 'Your personalized growth strategy is ready.'
  } else if (runningTask) {
    description = `Now: ${runningTask.label.toLowerCase()}…`
  } else if (jobStatus === 'queued') {
    description = 'Starting report generation — preparing competitor and video data…'
  }

  return { tasks, description, progressPercent: pct }
}
