'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
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
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to add competitor.'
        setError(typeof message === 'string' ? message : 'Failed to add competitor.')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="competitor_handle"
            disabled={isPending}
            className="w-full h-12 pl-9 pr-4 rounded-xl border border-white/10 bg-black text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50"
          />
        </div>
        <Button type="submit" disabled={isPending} className="h-12 px-6 font-bold shrink-0">
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add competitor
            </>
          )}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </form>
  )
}
