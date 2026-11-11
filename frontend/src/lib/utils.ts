import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The API stores UTC timestamps without an offset ("2026-11-11T03:16:45"), which
 * `new Date()` would read as local time. Treat offset-less values as UTC.
 */
export function parseApiDate(value: string): Date {
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  return new Date(hasOffset || isDateOnly ? value : `${value}Z`)
}

export function formatLastSynced(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Never synced'

  const date = parseApiDate(isoDate)
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
    return 'Could not reach Instagram. Connection timed out. Check your internet and try again.'
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

  const lastSuccess = parseApiDate(lastSyncedAt).getTime()
  const jobTimeSource = syncJob.completed_at || syncJob.created_at
  if (!jobTimeSource) return true

  const jobFinished = parseApiDate(jobTimeSource).getTime()
  return jobFinished > lastSuccess
}

type ApiErrorLike = {
  response?: { status?: number; data?: { detail?: unknown } }
}

/** Human-readable message from an axios error (FastAPI `detail`), with a fallback. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const response = (error as ApiErrorLike | null)?.response
  if (response?.status === 429) return 'Too many attempts. Please wait a bit and try again.'
  const detail = response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  // FastAPI 422s: [{loc, msg, ...}] — show the first message without pydantic's prefix.
  if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') {
    return detail[0].msg.replace(/^Value error, /, '')
  }
  return fallback
}

export function isNotFoundError(error: unknown): boolean {
  return (error as ApiErrorLike | null)?.response?.status === 404
}
