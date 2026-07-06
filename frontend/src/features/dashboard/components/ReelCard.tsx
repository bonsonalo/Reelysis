'use client'

import Link from 'next/link'
import { ReelThumbnail } from '@/features/dashboard/components/ReelThumbnail'
import { cn } from '@/lib/utils'

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

export function ReelCard({ video, formatNumber, className }: ReelCardProps) {
  return (
    <Link
      href={`/videos/${video.id}`}
      className={cn(
        'group relative aspect-[9/16] overflow-hidden rounded-[10px] border border-border-subtle bg-surface-card transition-[border-color,background-color] duration-150 hover:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
        className,
      )}
    >
      <ReelThumbnail
        thumbnailUrl={video.thumbnail_url}
        alt={video.caption || 'Reel'}
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/20" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/95 to-transparent px-3 pb-3 pt-14">
        <p
          className="line-clamp-2 text-sm font-medium leading-snug text-white"
          title={video.caption || undefined}
        >
          {video.caption || 'No caption'}
        </p>
        <div className="mt-2.5 flex items-end justify-between gap-2 border-t border-white/10 pt-2.5">
          <div>
            <p className="text-sm font-semibold tabular-nums text-white">
              {formatNumber(video.views)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-300">views</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums text-white">
              {video.engagement_rate}%
            </p>
            <p className="mt-0.5 text-xs text-zinc-300">engagement</p>
          </div>
        </div>
        <p
          className={cn(
            'mt-2 text-xs font-medium tabular-nums text-zinc-300',
            video.has_analysis && video.hook_score >= 80 && 'text-emerald-400',
          )}
        >
          {video.has_analysis
            ? `Hook ${video.hook_score}/100`
            : 'Hook score after report'}
        </p>
      </div>
    </Link>
  )
}
