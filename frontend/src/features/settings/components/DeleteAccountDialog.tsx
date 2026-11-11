'use client'

import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/shared/Panel'
import { SettingsField } from './settingsUi'

type DeleteAccountDialogProps = {
  open: boolean
  isPending: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (password: string) => void
}

export function DeleteAccountDialog({
  open,
  isPending,
  error,
  onClose,
  onConfirm,
}: DeleteAccountDialogProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, isPending, onClose])

  if (!open) return null

  // Mounted only while open, so the password field starts empty every time.
  return (
    <DeleteAccountDialogBody
      titleId={titleId}
      isPending={isPending}
      error={error}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}

function DeleteAccountDialogBody({
  titleId,
  isPending,
  error,
  onClose,
  onConfirm,
}: Omit<DeleteAccountDialogProps, 'open'> & { titleId: string }) {
  const [password, setPassword] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-foreground/30"
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
        className="relative z-10 w-full max-w-md overflow-hidden shadow-overlay"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (password) onConfirm(password)
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold text-foreground">
                Delete account
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Permanently delete your Reelysis account and everything in it.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="shrink-0 rounded-md p-1.5 text-text-tertiary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 px-4 py-5 sm:px-6">
            <p className="text-sm leading-relaxed text-text-secondary">
              Your login, Instagram connection, Reels, competitors, analyses and reports will be
              deleted immediately. This cannot be undone.
            </p>
            <SettingsField
              id="delete-account-password"
              label="Enter your password to confirm"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              disabled={isPending}
            />
            {error ? (
              <p
                className="rounded-[10px] border border-red-200 bg-danger-tint px-3 py-2.5 text-sm leading-relaxed text-danger"
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
              type="submit"
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={isPending || !password}
            >
              <ButtonLoadingLabel loading={isPending} loadingLabel="Deleting…">
                Delete account
              </ButtonLoadingLabel>
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  )
}
