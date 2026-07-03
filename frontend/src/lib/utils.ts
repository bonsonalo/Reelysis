import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatLastSynced(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Never synced'

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatSyncError(message: string): string {
  if (message.includes('ConnectTimeout')) {
    return 'Could not reach Instagram — connection timed out. Check your internet and try again.'
  }
  if (message.includes('ReadTimeout')) {
    return 'Instagram took too long to respond. Try again in a moment.'
  }
  return message
}

type SyncJobLike = {
  status?: string
  error_message?: string
  completed_at?: string
  created_at?: string
}

/** True when the latest sync job failed after the last successful sync. */
export function isLatestSyncAttemptFailed(
  lastSyncedAt: string | null | undefined,
  syncJob: SyncJobLike | null | undefined,
): boolean {
  if (!syncJob || syncJob.status !== 'failed' || !syncJob.error_message) return false
  if (!lastSyncedAt) return true

  const lastSuccess = new Date(lastSyncedAt).getTime()
  const jobTimeSource = syncJob.completed_at || syncJob.created_at
  if (!jobTimeSource) return true

  const jobFinished = new Date(jobTimeSource).getTime()
  return jobFinished > lastSuccess
}
