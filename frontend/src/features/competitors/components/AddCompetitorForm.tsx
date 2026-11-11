'use client'

import { getApiErrorMessage } from '@/lib/utils'
import { useState } from 'react'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'
import { useAddCompetitor } from '../hooks/useCompetitors'

interface AddCompetitorFormProps {
  className?: string
  onAdded?: () => void
}

export function AddCompetitorForm({ className, onAdded }: AddCompetitorFormProps) {
  const [handle, setHandle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutate: addCompetitor, isPending } = useAddCompetitor()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = handle.trim().replace(/^@/, '')
    if (!trimmed) {
      setError('Enter an Instagram handle.')
      return
    }

    setError(null)
    addCompetitor(trimmed, {
      onSuccess: () => {
        setHandle('')
        onAdded?.()
      },
      onError: (err: unknown) => {
        setError(getApiErrorMessage(err, 'Failed to add competitor.'))
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary">
            @
          </span>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="competitor_handle"
            disabled={isPending}
            className="h-10 w-full rounded-[10px] border border-border-subtle bg-surface-input pl-8 pr-3 text-sm text-white placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          />
        </div>
        <Button type="submit" size="sm" disabled={isPending} className="shrink-0">
          <ButtonLoadingLabel loading={isPending} loadingLabel="Adding…">
            Add competitor
          </ButtonLoadingLabel>
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </form>
  )
}
