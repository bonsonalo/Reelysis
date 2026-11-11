'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export function getInitials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.trim().slice(0, 2).toUpperCase()
  }
  return (email?.[0] ?? 'U').toUpperCase()
}

type UserAvatarProps = {
  name?: string | null
  email?: string | null
  /** The connected Instagram profile photo, when there is one. */
  imageUrl?: string | null
  className?: string
}

/**
 * The person's own Instagram photo; if there isn't one (or it fails to load),
 * quiet initials on a white disc so the avatar never competes with the brand mark.
 */
export function UserAvatar({ name, email, imageUrl, className }: UserAvatarProps) {
  const [failed, setFailed] = useState(false)

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn(
          'shrink-0 rounded-full object-cover ring-1 ring-border-subtle',
          className,
        )}
      />
    )
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-surface-card font-medium tracking-[0.02em] text-text-secondary ring-1 ring-border-strong',
        className,
      )}
      aria-hidden
    >
      {getInitials(name, email)}
    </span>
  )
}
