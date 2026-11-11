'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { Eye, Pencil, Plus, Target, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/shared/Panel'
import { CompetitorAvatar } from '@/features/competitors/components/CompetitorAvatar'
import { useCompetitors } from '@/features/competitors/hooks/useCompetitors'
import { GrowthChart } from '@/features/dashboard/components/GrowthChart'
import { ContentPillarsChart } from '@/features/dashboard/components/ContentPillarsChart'
import { DashboardReelsSection } from '@/features/dashboard/components/DashboardReelsGrid'
import { DashboardStatCard } from '@/features/dashboard/components/DashboardStatCard'
import { AiInsightsPending } from '@/features/dashboard/components/AiInsightsPending'
import { AI_INSIGHTS_EMPTY } from '@/features/dashboard/constants/aiInsightsCopy'
import { ProcessStatus } from '@/components/shared/ProcessStatus'
import { getInstagramSyncUi } from '@/features/jobs/utils/jobProgressUtils'
import { METRIC_HELP } from '@/features/dashboard/constants/metricHelp'
import { useContentPillars } from '@/features/dashboard/hooks/useContentPillars'
import { useDashboardGrowth } from '@/features/dashboard/hooks/useDashboardGrowth'
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats'
import { useDashboardVideos } from '@/features/dashboard/hooks/useDashboardVideos'
import { useAnalysisJob, useAnalysisJobById } from '@/features/instagram/hooks/useAnalysisJob'
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { useTriggerSync } from '@/features/instagram/hooks/useTriggerSync'
import { ReconnectInstagramBanner } from '@/features/instagram/components/ReconnectInstagramBanner'
import { formatLastSynced, formatSyncError, isLatestSyncAttemptFailed, cn } from '@/lib/utils'

const SYNC_POLL_TIMEOUT_MS = 5 * 60 * 1000

function formatNumber(num: number) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

function formatHookPointChange(hookChange?: string, hasScore?: boolean) {
  // The API sends "0" when there is no earlier score to compare with, "+0" for no change.
  if (!hookChange || hookChange === '0') {
    return hasScore ? 'New' : '0 pts'
  }
  return `${hookChange} pts`
}

function SectionHeader({
  title,
  description,
  onSurface = false,
}: {
  title: string
  description?: string
  onSurface?: boolean
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {description && (
        <p
          className={cn(
            'mt-1 text-sm leading-relaxed',
            onSurface ? 'text-text-label' : 'text-text-secondary',
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const [pendingSyncJobId, setPendingSyncJobId] = useState<string | null>(null)
  const pollWhileActive = (query: { state: { data?: { status?: string } | null } }) => {
    const status = query.state.data?.status
    return status === 'queued' || status === 'running' ? 2000 : false
  }

  const { mutate: triggerSync, isPending: isSyncing } = useTriggerSync()
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useDashboardStats()
  const { data: growth, isLoading: isLoadingGrowth, refetch: refetchGrowth } = useDashboardGrowth()
  const { data: pillars, isLoading: isLoadingPillars, refetch: refetchPillars } =
    useContentPillars()
  const { data: videos, isLoading: isLoadingVideos, refetch: refetchVideos } =
    useDashboardVideos()
  const {
    data: competitors,
    isLoading: isLoadingCompetitors,
    isError: isCompetitorsError,
  } = useCompetitors()
  const { data: latestSyncJob } = useAnalysisJob('instagram_sync')
  // Follow syncs started elsewhere too (reconnect, the daily scheduler, another tab).
  const activeSyncJobId =
    pendingSyncJobId ??
    (latestSyncJob && (latestSyncJob.status === 'queued' || latestSyncJob.status === 'running')
      ? String(latestSyncJob.id)
      : null)
  const { data: pendingSyncJob } = useAnalysisJobById(activeSyncJobId, {
    refetchInterval: pollWhileActive,
  })

  const syncJob = activeSyncJobId ? pendingSyncJob : latestSyncJob
  const syncInProgress =
    isSyncing ||
    (!!activeSyncJobId &&
      (!pendingSyncJob ||
        pendingSyncJob.status === 'queued' ||
        pendingSyncJob.status === 'running'))

  const { data: accounts, refetch: refetchAccounts } = useInstagramAccounts({
    refetchInterval: syncInProgress ? 3000 : false,
  })

  const completedJobIdRef = useRef<string | null>(null)
  const account = accounts?.[0]
  const showSyncFailure =
    isLatestSyncAttemptFailed(account?.last_synced_at, syncJob) && !!syncJob?.error_message

  const refreshDashboardData = () => {
    refetchAccounts()
    refetchStats()
    refetchGrowth()
    refetchPillars()
    refetchVideos()
  }

  const handleSync = () => {
    if (syncInProgress) return
    triggerSync(undefined, {
      onSuccess: (data) => {
        setPendingSyncJobId(String(data.job_id))
      },
    })
  }

  // Give up client-side polling after a while even if the job never changes; the
  // backend reconciler will eventually mark a stuck job as failed.
  useEffect(() => {
    if (!pendingSyncJobId) return
    const timer = window.setTimeout(() => {
      setPendingSyncJobId((current) => (current === pendingSyncJobId ? null : current))
      queryClient.invalidateQueries({ queryKey: ['analysis-job', 'instagram_sync'] })
    }, SYNC_POLL_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [pendingSyncJobId, queryClient])

  useEffect(() => {
    if (!activeSyncJobId || !pendingSyncJob) return

    const isDone =
      pendingSyncJob.status === 'succeeded' || pendingSyncJob.status === 'failed'
    if (!isDone) return
    if (completedJobIdRef.current === activeSyncJobId) return

    completedJobIdRef.current = activeSyncJobId
    queryClient.invalidateQueries({ queryKey: ['analysis-job', 'instagram_sync'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-growth'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-pillars'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-videos'] })
    queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] })
    refreshDashboardData()
    setPendingSyncJobId(null)
  }, [activeSyncJobId, pendingSyncJob, queryClient])

  const syncUi = getInstagramSyncUi(
    syncJob?.progress ?? 0,
    syncJob?.status,
    !!account?.niche_detected,
  )

  // Accounts loaded and empty: syncing would only 400, so send the user to connect instead.
  const needsInstagram = accounts !== undefined && !account

  const syncStatusLabel = syncInProgress
    ? syncUi.description
    : account?.last_synced_at
      ? `Last synced ${formatLastSynced(account.last_synced_at)}`
      : needsInstagram
        ? 'Connect Instagram to import your Reels'
        : 'Run New Analysis to import your Reels'

  const pillarRows = pillars?.data ?? []
  const hasVideoAnalysis = stats?.has_video_analysis ?? false

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {account?.username ? (
              <>
                <span className="text-text-secondary">@</span>
                <span className="text-primary">{account.username}</span>
              </>
            ) : (
              <span className="text-white">Your account</span>
            )}
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">{syncStatusLabel}</p>
          {showSyncFailure && syncJob?.error_message && (
            <p className="mt-2 text-sm text-red-400">
              Sync failed: {formatSyncError(syncJob.error_message)}
            </p>
          )}
          {account?.niche_confirmed && (
            <div className="mt-3 inline-flex max-w-full items-center gap-2 text-sm">
              <span className="shrink-0 text-text-tertiary">Niche</span>
              <span className="truncate text-text-label">
                {account.niche_confirmed}
              </span>
              <Link
                href="/settings?tab=account#content-niche"
                className="inline-flex shrink-0 items-center gap-1 text-text-tertiary transition-colors duration-150 hover:text-white"
                aria-label="Edit niche"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
        {needsInstagram ? (
          <Link href="/onboarding" className="w-full shrink-0 sm:w-auto">
            <Button className="w-full">Connect Instagram</Button>
          </Link>
        ) : (
          <Button
            onClick={handleSync}
            disabled={syncInProgress}
            className="w-full shrink-0 sm:w-auto"
          >
            <ButtonLoadingLabel loading={syncInProgress} loadingLabel="Syncing…">
              <>
                <Plus className="h-4 w-4" />
                New Analysis
              </>
            </ButtonLoadingLabel>
          </Button>
        )}
      </header>

      {account?.needs_reconnect && <ReconnectInstagramBanner username={account.username} />}

      {syncInProgress && (
        <ProcessStatus statusText={syncUi.description} tasks={syncUi.tasks} />
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoadingStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[128px] animate-pulse rounded-[10px] bg-surface-card"
            />
          ))
        ) : (
          <>
            <DashboardStatCard
              label="Total views"
              help={METRIC_HELP.totalViews}
              value={stats ? formatNumber(stats.total_views) : '0'}
              change={stats?.views_change || '0%'}
              icon={Eye}
            />
            <DashboardStatCard
              label="Average reach"
              help={METRIC_HELP.averageReach}
              value={stats ? formatNumber(stats.avg_reach) : '0'}
              change={stats?.reach_change || '0%'}
              icon={Users}
            />
            <DashboardStatCard
              label="Avg. engagement"
              help={METRIC_HELP.avgEngagement}
              value={stats ? `${stats.avg_engagement}%` : '0%'}
              change={stats?.engagement_change || '0%'}
              icon={TrendingUp}
            />
            <DashboardStatCard
              label="Top hook score"
              help={METRIC_HELP.topHookScore}
              value={stats ? `${Math.round(stats.top_hook_score)}/100` : '0/100'}
              change={formatHookPointChange(stats?.hook_change, Boolean(stats?.top_hook_score))}
              footerNote={
                stats?.top_analysis_confidence
                  ? `${Math.round(stats.top_analysis_confidence)}% confidence`
                  : undefined
              }
              footerNoteHelp={METRIC_HELP.aiConfidence}
              icon={Target}
              pending={!hasVideoAnalysis}
              pendingHint={`${AI_INSIGHTS_EMPTY.primary} Go to Reports to generate one.`}
            />
          </>
        )}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel className="p-5 sm:p-6 lg:col-span-2">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeader
              title="Views vs reach"
              description="Total views and reach across your Reels, recorded at each sync"
              onSurface
            />
            <div className="flex items-center gap-5 text-sm">
              <span className="inline-flex items-center gap-2 text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Views
              </span>
              <span className="inline-flex items-center gap-2 text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-zinc-400" />
                Reach
              </span>
            </div>
          </div>
          <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
            {isLoadingGrowth ? (
              <div className="h-full w-full animate-pulse rounded-[10px] bg-white/[0.03]" />
            ) : growth?.data && growth.data.length > 0 ? (
              <GrowthChart data={growth.data} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="max-w-xs text-center text-sm text-text-secondary">
                  Sync again after posting more Reels to see trends here.
                </p>
              </div>
            )}
          </div>
        </Panel>

        <Panel className="flex flex-col p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <SectionHeader
              title="Competitors"
              description="Accounts you're tracking"
              onSurface
            />
            <span className="text-xs tabular-nums text-text-secondary">
              {competitors?.length || 0}
            </span>
          </div>

          <div className="flex-1 space-y-3.5">
            {isLoadingCompetitors ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.06]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-2.5 w-16 animate-pulse rounded bg-white/[0.04]" />
                  </div>
                </div>
              ))
            ) : isCompetitorsError ? (
              <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                Couldn&apos;t load competitors right now.
              </p>
            ) : (competitors || []).length > 0 ? (
              <>
                {(competitors || []).slice(0, 5).map((comp) => {
                  const displayHandle = comp.handle || comp.display_name || 'Competitor'
                  return (
                    <div key={comp.id} className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                        <CompetitorAvatar
                          competitorId={comp.id}
                          handle={displayHandle}
                          className="h-full w-full"
                          iconClassName="h-3.5 w-3.5"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          @{displayHandle}
                        </p>
                        <p className="text-xs text-text-label">
                          {formatNumber(comp.followers_count || 0)} followers
                        </p>
                      </div>
                    </div>
                  )
                })}
                {(competitors || []).length > 5 && (
                  <p className="text-xs text-text-tertiary">
                    +{(competitors || []).length - 5} more
                  </p>
                )}
              </>
            ) : (
              <PageEmptyState
                className="py-4 md:py-6"
                primary={
                  account
                    ? 'No competitors yet. Add accounts from the competitors page or refresh suggestions.'
                    : 'Connect Instagram to discover competitors.'
                }
              />
            )}
          </div>

          <Link href="/competitors" className="mt-6 block">
            <Button variant="outline" className="w-full">
              Manage competitors
            </Button>
          </Link>
        </Panel>
      </section>

      <Panel className="p-5 sm:p-6">
        <SectionHeader
          title="Content pillars"
          description="Themes ranked by the engagement they drive in your Reels"
          onSurface
        />

        <div className="mt-6">
          {isLoadingPillars ? (
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-2 w-full animate-pulse rounded-full bg-white/[0.04]" />
                </div>
              ))}
            </div>
          ) : pillarRows.length ? (
            <ContentPillarsChart data={pillarRows} />
          ) : (
            <AiInsightsPending />
          )}
        </div>
      </Panel>

      <DashboardReelsSection
        videos={videos?.data ?? []}
        isLoading={isLoadingVideos}
        formatNumber={formatNumber}
        showAiPendingHint={!hasVideoAnalysis && (videos?.data?.length ?? 0) > 0}
      />
    </div>
  )
}
