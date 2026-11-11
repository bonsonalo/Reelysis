'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/axios'

type CompetitorAvatarProps = {
  competitorId: string
  handle: string
  className?: string
  iconClassName?: string
}

// Shared through the React Query cache so every place showing the same competitor
// (dashboard, mobile list, desktop table) reuses one request and one object URL.
function useCompetitorAvatarUrl(competitorId: string) {
  return useQuery({
    queryKey: ['competitor-avatar', competitorId],
    queryFn: async () => {
      const response = await api.get<Blob>(`/api/v1/competitors/${competitorId}/avatar`, {
        responseType: 'blob',
      })
      return URL.createObjectURL(response.data)
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: false,
  })
}

export function CompetitorAvatar({
  competitorId,
  handle,
  className,
  iconClassName,
}: CompetitorAvatarProps) {
  const { data: src, isError } = useCompetitorAvatarUrl(competitorId)
  const [failed, setFailed] = useState(false)

  if (!src || isError || failed) {
    return (
      <div className={cn('flex items-center justify-center bg-surface-pressed', className)}>
        <Users2 className={cn('text-text-placeholder', iconClassName)} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={handle}
      className={cn('object-cover', className)}
      onError={() => setFailed(true)}
    />
  )
}
