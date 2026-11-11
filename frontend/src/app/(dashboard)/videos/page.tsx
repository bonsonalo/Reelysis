'use client'

import { useAllVideos } from '@/features/dashboard/hooks/useDashboardVideos'
import { ReelCard } from '@/features/dashboard/components/ReelCard'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { PageHeader } from '@/components/shared/Panel'
import { PageErrorState } from '@/components/shared/PageErrorState'
import { AiInsightsPending } from '@/features/dashboard/components/AiInsightsPending'
import { VideosPageSkeleton } from '@/components/shared/PageSkeletons'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { Button } from '@/components/ui/button'

export default function AllVideosPage() {
  const {
    data,
    isLoading,
    isError,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAllVideos()

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  if (isLoading) {
    return <VideosPageSkeleton />
  }

  if (isError && !data) {
    return (
      <PageErrorState
        title="Couldn’t load your Reels"
        onRetry={() => refetch()}
        retrying={isRefetching}
      />
    )
  }

  const videos = data?.pages.flatMap((page) => page.data) ?? []
  const total = data?.pages[0]?.total ?? videos.length
  const reelCount = videos.length
  const hasAnyAnalysis = videos.some((video) => video.has_analysis)

  return (
    <div className="space-y-6 pb-16 sm:space-y-8">
      <PageHeader
        title="Reels"
        description={
          <>
            <p>
              Every synced Reel with its views, engagement and hook score
              {reelCount > 0 && (
                <span className="text-text-tertiary">
                  {' '}
                  ({total} {total === 1 ? 'Reel' : 'Reels'})
                </span>
              )}
              .
            </p>
            {reelCount > 0 && !hasAnyAnalysis && (
              <AiInsightsPending variant="inline" className="mt-1.5" />
            )}
          </>
        }
      />

      {reelCount === 0 ? (
        <PageEmptyState
          primary="No Reels synced yet."
          secondary="Connect Instagram and run a sync from the dashboard to import them."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {videos.map((video) => (
              <ReelCard key={video.id} video={video} formatNumber={formatNumber} />
            ))}
          </div>
          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                <ButtonLoadingLabel loading={isFetchingNextPage} loadingLabel="Loading…">
                  Load more
                </ButtonLoadingLabel>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
