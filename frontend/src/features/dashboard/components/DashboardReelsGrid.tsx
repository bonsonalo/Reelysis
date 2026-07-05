'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { ReelCard } from '@/features/dashboard/components/ReelCard'

type ReelItem = {
  id: string
  thumbnail_url?: string
  caption?: string
  hook_score: number
  views: number
  engagement_rate: number | string
}

type DashboardReelsGridProps = {
  videos: ReelItem[]
  isLoading: boolean
  formatNumber: (num: number) => string
}

export function DashboardReelsGrid({
  videos,
  isLoading,
  formatNumber,
}: DashboardReelsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[9/16] animate-pulse rounded-[10px] bg-surface-card"
          />
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
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
}: DashboardReelsGridProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">Recent Reels</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Latest Reels from your account, with views and engagement
          </p>
        </div>
        <Link href="/videos">
          <Button
            variant="ghost"
            size="sm"
            className="group px-3 text-sm text-primary hover:bg-primary/10 hover:text-primary"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Button>
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
