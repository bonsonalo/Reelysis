'use client'

import Link from 'next/link'
import { buttonStyles } from '@/components/ui/button'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { ReelCard } from '@/features/dashboard/components/ReelCard'
import { AiInsightsPending } from '@/features/dashboard/components/AiInsightsPending'

type ReelItem = {
  id: string
  thumbnail_url?: string
  caption?: string
  hook_score: number
  views: number
  engagement_rate: number | string
  has_analysis?: boolean
}

type DashboardReelsGridProps = {
  videos: ReelItem[]
  isLoading: boolean
  formatNumber: (num: number) => string
  showAiPendingHint?: boolean
}

export function DashboardReelsGrid({
  videos,
  isLoading,
  formatNumber,
}: DashboardReelsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[10px] border border-border-subtle bg-surface-card"
          >
            <div className="aspect-[4/5] animate-pulse bg-surface-hover" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-4/5 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!videos.length) {
    return (
      <PageEmptyState
        className="py-4 md:py-6"
        primary="No Reels synced yet."
        secondary="Run a sync from the dashboard to import them."
      />
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {videos.map((video) => (
        <ReelCard
          key={video.id}
          video={video}
          formatNumber={formatNumber}
        />
      ))}
    </div>
  )
}

export function DashboardReelsSection({
  videos,
  isLoading,
  formatNumber,
  showAiPendingHint = false,
}: DashboardReelsGridProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-foreground">Recent Reels</h2>
          <p className="mt-0.5 text-[13px] text-text-tertiary">
            Latest Reels from your account, with views and engagement
          </p>
          {showAiPendingHint && (
            <AiInsightsPending variant="inline" className="mt-2" />
          )}
        </div>
        <Link
          href="/videos"
          className={buttonStyles({ variant: 'outline', size: 'sm', className: 'self-start sm:self-auto' })}
        >
          View all Reels
        </Link>
      </div>
      <DashboardReelsGrid
        videos={videos}
        isLoading={isLoading}
        formatNumber={formatNumber}
      />
    </section>
  )
}
