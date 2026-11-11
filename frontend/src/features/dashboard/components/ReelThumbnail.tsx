'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'

type ReelThumbnailProps = {
  thumbnailUrl?: string | null
  alt: string
  className?: string
}

export function ReelThumbnail({ thumbnailUrl, alt, className }: ReelThumbnailProps) {
  const [failed, setFailed] = useState(false)

  if (!thumbnailUrl || failed) {
    return (
      <div className={cn('flex items-center justify-center bg-surface-hover', className)}>
        <Play className="h-6 w-6 text-text-placeholder" aria-hidden />
      </div>
    )
  }

  return (
    <img
      src={thumbnailUrl}
      alt={alt}
      className={cn('object-cover', className)}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
