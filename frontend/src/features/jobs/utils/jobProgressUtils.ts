export type ProgressTaskStatus = 'pending' | 'running' | 'completed'

export type ProgressTask = {
  label: string
  status: ProgressTaskStatus
}

export function phaseStatus(
  progress: number,
  start: number,
  end: number,
  jobStatus: string,
): ProgressTaskStatus {
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

function runningTaskDescription(tasks: ProgressTask[], fallback: string) {
  const running = tasks.find((t) => t.status === 'running')
  return running ? `${running.label}…` : fallback
}

export function getCompetitorDiscoveryUi(progress: number, status: string | undefined) {
  const jobStatus = status ?? 'queued'
  const pct = jobStatus === 'succeeded' ? 100 : Math.min(100, Math.max(0, progress))

  const tasks: ProgressTask[] = [
    {
      label: 'Searching accounts in your niche',
      status: phaseStatus(pct, 0, 35, jobStatus),
    },
    {
      label: 'Fetching profile and Reel data',
      status: phaseStatus(pct, 35, 75, jobStatus),
    },
    {
      label: 'Ranking by engagement',
      status: phaseStatus(pct, 75, 100, jobStatus),
    },
  ]

  let description = runningTaskDescription(tasks, 'Finding competitor accounts…')
  if (jobStatus === 'failed') {
    description = 'Discovery failed. You can retry or add accounts manually.'
  } else if (jobStatus === 'queued') {
    description = 'Starting competitor discovery…'
  }

  return { tasks, description }
}

export function getInstagramSyncUi(
  progress: number,
  status: string | undefined,
  hasNiche: boolean,
) {
  const jobStatus = status ?? 'queued'
  const pct = jobStatus === 'succeeded' ? 100 : Math.min(100, Math.max(0, progress))

  // Mirrors the backend sync task: profile refresh (0–5), media import (5–95), niche (95–100).
  // Transcription runs as a separate job after the sync finishes.
  const tasks: ProgressTask[] = [
    {
      label: 'Connecting to Instagram',
      status: phaseStatus(pct, 0, 5, jobStatus),
    },
    {
      label: 'Importing Reels and metrics',
      status: phaseStatus(pct, 5, 95, jobStatus),
    },
    {
      label: 'Detecting content niche',
      status: hasNiche ? 'completed' : phaseStatus(pct, 95, 100, jobStatus),
    },
  ]

  let description = runningTaskDescription(tasks, 'Syncing your Reels…')
  if (jobStatus === 'failed') {
    description = 'Sync failed. Try again or check your Instagram connection.'
  } else if (jobStatus === 'queued') {
    description = 'Starting sync…'
  }

  return { tasks, description }
}
