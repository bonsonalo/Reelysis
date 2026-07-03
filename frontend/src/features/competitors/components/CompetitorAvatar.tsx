'use client'

import { useEffect, useState } from 'react'
import { Users2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/axios'

type CompetitorAvatarProps = {
  competitorId: string
  handle: string
  className?: string
  iconClassName?: string
}

export function CompetitorAvatar({
  competitorId,
  handle,
  className,
  iconClassName,
}: CompetitorAvatarProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    const load = async () => {
      setFailed(false)
      setSrc(null)
      try {
        const response = await api.get(`/api/v1/competitors/${competitorId}/avatar`, {
          responseType: 'blob',
        })
        if (cancelled) return
        objectUrl = URL.createObjectURL(response.data)
        setSrc(objectUrl)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    void load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [competitorId])

  if (!src || failed) {
    return (
      <div className={cn('flex items-center justify-center bg-zinc-800', className)}>
        <Users2 className={cn('text-zinc-600', iconClassName)} />
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
