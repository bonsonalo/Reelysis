'use client'

import Link from 'next/link'
import { ReelThumbnail } from '@/features/dashboard/components/ReelThumbnail'
import { cn, stripTrailingHashtags } from '@/lib/utils'

type ReelCardVideo = {
  id: string
  thumbnail_url?: string
  caption?: string
  hook_score: number
  views: number
  engagement_rate: number | string
  has_analysis?: boolean
}

type ReelCardProps = {
  video: ReelCardVideo
  formatNumber: (num: number) => string
  className?: string
}

export function hookScoreBadgeClass(score: number) {
  if (score >= 80) return 'bg-success-tint text-success'
  if (score < 50) return 'bg-surface-hover text-text-secondary'
  return 'bg-warning-tint text-warning'
}

export function ReelCard({ video, formatNumber, className }: ReelCardProps) {
  return (
    <Link
      href={`/videos/${video.id}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-[10px] border border-border-subtle bg-surface-card shadow-raised transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-overlay',
        className,
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-hover">
        <ReelThumbnail
          thumbnailUrl={video.thumbnail_url}
          alt=""
          className="h-full w-full object-cover"
        />
        {video.has_analysis && (
          <span
            className={cn(
              'absolute left-2 top-2 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums shadow-raised',
              hookScoreBadgeClass(video.hook_score),
            )}
            title="Hook score"
          >
            {video.hook_score}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p
          className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground"
          title={video.caption || undefined}
        >
          {stripTrailingHashtags(video.caption) || video.caption || 'No caption'}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5 text-xs tabular-nums text-text-tertiary">
          <span>
            <span className="font-medium text-text-label">{formatNumber(video.views)}</span> views
          </span>
          <span>
            <span className="font-medium text-text-label">{video.engagement_rate}%</span> eng.
          </span>
        </div>
      </div>
    </Link>
  )
}
