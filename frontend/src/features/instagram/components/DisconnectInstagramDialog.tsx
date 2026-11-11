'use client'

import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/shared/Panel'

type DisconnectInstagramDialogProps = {
  open: boolean
  username?: string
  isPending: boolean
  error?: string | null
  onClose: () => void
  onConfirm: () => void
}

export function DisconnectInstagramDialog(props: DisconnectInstagramDialogProps) {
  // Mount the body only while open so its "acknowledged" checkbox starts unticked every time.
  if (!props.open) return null
  return <DisconnectInstagramDialogBody {...props} />
}

function DisconnectInstagramDialogBody({
  username,
  isPending,
  error,
  onClose,
  onConfirm,
}: DisconnectInstagramDialogProps) {
  const titleId = useId()
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
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
  }, [isPending, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
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
        className="relative z-10 w-full max-w-md overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-white">
              Disconnect Instagram
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">
              {username ? (
                <>
                  Unlink{' '}
                  <span className="text-text-label">@{username}</span> and remove all synced data
                  from Reelysis.
                </>
              ) : (
                <>Unlink your account and remove all synced data from Reelysis.</>
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

        <div className="space-y-4 px-4 py-5 sm:px-6">
          <p className="text-sm leading-relaxed text-text-secondary">
            Your Reels, competitors, analyses, and reports will be deleted immediately. You can
            connect again later, but that data cannot be restored.
          </p>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={isPending}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border-subtle bg-surface-input accent-primary disabled:cursor-not-allowed"
            />
            <span className="text-sm leading-relaxed text-text-label">
              I understand this is permanent.
            </span>
          </label>

          {error ? (
            <p
              className="rounded-[10px] border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm leading-relaxed text-red-400"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border-subtle px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
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
            className="w-full sm:w-auto"
            disabled={isPending || !acknowledged}
            onClick={onConfirm}
          >
            <ButtonLoadingLabel loading={isPending} loadingLabel="Disconnecting…">
              Disconnect
            </ButtonLoadingLabel>
          </Button>
        </div>
      </Panel>
    </div>
  )
}
