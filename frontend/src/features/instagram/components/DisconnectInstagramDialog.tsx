'use client'

import { useEffect, useId, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/shared/Panel'
import { cn } from '@/lib/utils'

const REMOVED_ITEMS = [
  'Instagram connection and sync access',
  'Synced Reels, metrics, and hook scores',
  'Competitors and their analyzed content',
  'Strategy reports and action items',
  'Background analysis jobs',
] as const

type DisconnectInstagramDialogProps = {
  open: boolean
  username?: string
  isPending: boolean
  error?: string | null
  onClose: () => void
  onConfirm: () => void
}

export function DisconnectInstagramDialog({
  open,
  username,
  isPending,
  error,
  onClose,
  onConfirm,
}: DisconnectInstagramDialogProps) {
  const titleId = useId()
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    if (!open) {
      setAcknowledged(false)
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, isPending, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        aria-label="Close dialog"
        disabled={isPending}
        onClick={() => {
          if (!isPending) onClose()
        }}
      />

      <Panel
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-4 py-4 md:px-6 md:py-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold text-white md:text-base">
              Disconnect Instagram?
            </h2>
            <p className="mt-1 text-xs text-text-secondary md:text-sm">
              {username ? (
                <>
                  Unlink <span className="text-text-label">@{username}</span> and delete all synced
                  data from Reelysis.
                </>
              ) : (
                <>Unlink your account and delete all synced data from Reelysis.</>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="shrink-0 rounded-md p-1.5 text-text-tertiary transition-colors duration-150 hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 md:px-6 md:py-5">
          <div className="rounded-[10px] border border-red-500/15 bg-red-500/5 p-4">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-red-300 md:text-sm">
                  Permanent. This cannot be undone
                </p>
                <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-red-400/90 md:text-sm">
                  {REMOVED_ITEMS.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-red-400/80" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-border-subtle bg-surface-input px-3 py-3 md:px-4">
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={isPending}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-subtle bg-surface-page accent-primary"
            />
            <span className="text-xs leading-relaxed text-text-secondary md:text-sm">
              I understand all synced Reels, competitors, reports, and analyses will be deleted
              immediately.
            </span>
          </label>

          {error && (
            <p className="text-xs text-red-400 md:text-sm" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border-subtle px-4 py-4 sm:flex-row sm:justify-end md:px-6">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className={cn('w-full sm:w-auto', !acknowledged && 'opacity-60')}
            disabled={isPending || !acknowledged}
            onClick={onConfirm}
          >
            <ButtonLoadingLabel loading={isPending} loadingLabel="Disconnecting…">
              Disconnect and delete data
            </ButtonLoadingLabel>
          </Button>
        </div>
      </Panel>
    </div>
  )
}
