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
      <div className={cn('flex items-center justify-center bg-zinc-900', className)}>
        <Play className="h-8 w-8 text-zinc-600" />
      </div>
    )
  }

  return (
    <img
      src={thumbnailUrl}
      alt={alt}
      className={cn('object-cover', className)}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
