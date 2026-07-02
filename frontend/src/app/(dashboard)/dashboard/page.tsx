'use client'

import Link from 'next/link'
import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats'
import { useDashboardGrowth } from '@/features/dashboard/hooks/useDashboardGrowth'
import { useContentPillars } from '@/features/dashboard/hooks/useContentPillars'
import { useDashboardVideos } from '@/features/dashboard/hooks/useDashboardVideos'
import { useCompetitors } from '@/features/competitors/hooks/useCompetitors'
import { CompetitorAvatar } from '@/features/competitors/components/CompetitorAvatar'
import { useTriggerSync } from '@/features/instagram/hooks/useTriggerSync'
import { useAnalysisJob, useAnalysisJobById } from '@/features/instagram/hooks/useAnalysisJob'
import { 
  Eye, 
  Users, 
  TrendingUp, 
  Zap,
  ArrowUpRight,
  Plus,
  Loader2,
  Users2,
  Tag,
  // Video,
  Target,
  Play,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatLastSynced, formatSyncError, isLatestSyncAttemptFailed } from '@/lib/utils'
import { GrowthChart } from '@/features/dashboard/components/GrowthChart'
import { ReelThumbnail } from '@/features/dashboard/components/ReelThumbnail'
import { MetricLabel } from '@/components/shared/MetricInfoTip'
import { METRIC_HELP } from '@/features/dashboard/constants/metricHelp'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

function getMetricChangeTone(change: string) {
  if (change.startsWith('-')) return 'text-red-400'
  if (change.startsWith('+')) return 'text-emerald-500'
  return 'text-muted-foreground'
}

function formatHookPointChange(hookChange?: string, hasScore?: boolean) {
  if (!hookChange || hookChange === '0') {
    return hasScore ? '+0 pts' : '0 pts'
  }
  return `${hookChange} pts`
}

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const [pendingSyncJobId, setPendingSyncJobId] = useState<string | null>(null)
  const pollWhileActive = (query: { state: { data?: { status?: string } | null } }) => {
    const status = query.state.data?.status
    return status === 'queued' || status === 'running' ? 2000 : false
  }

  const { mutate: triggerSync, isPending: isSyncing } = useTriggerSync()
  const { data: stats, isLoading, refetch: refetchStats } = useDashboardStats()
  const { data: growth, refetch: refetchGrowth } = useDashboardGrowth()
  const { data: pillars, isLoading: isLoadingPillars, refetch: refetchPillars } = useContentPillars()
  const { data: videos, isLoading: isLoadingVideos, refetch: refetchVideos } = useDashboardVideos()
  const { data: competitors, isLoading: isLoadingCompetitors, isError: isCompetitorsError } = useCompetitors()
  const { data: latestSyncJob } = useAnalysisJob('instagram_sync')
  const { data: pendingSyncJob } = useAnalysisJobById(pendingSyncJobId, {
    refetchInterval: pollWhileActive,
  })
  const syncJob = pendingSyncJobId ? pendingSyncJob : latestSyncJob
  const syncInProgress =
    isSyncing ||
    (!!pendingSyncJobId &&
      (!pendingSyncJob ||
        pendingSyncJob.status === 'queued' ||
        pendingSyncJob.status === 'running'))
  const { data: accounts, refetch: refetchAccounts } = useInstagramAccounts({
    refetchInterval: syncInProgress ? 3000 : false,
  })
  const completedJobIdRef = useRef<string | null>(null)
  const pollStartedAtRef = useRef<number | null>(null)
  const SYNC_POLL_TIMEOUT_MS = 5 * 60 * 1000
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
    pollStartedAtRef.current = Date.now()
    triggerSync(undefined, {
      onSuccess: (data) => {
        setPendingSyncJobId(String(data.job_id))
      },
    })
  }

  useEffect(() => {
    if (!pendingSyncJobId) {
      pollStartedAtRef.current = null
      return
    }
    if (!pollStartedAtRef.current) {
      pollStartedAtRef.current = Date.now()
    }
  }, [pendingSyncJobId])

  useEffect(() => {
    if (!pendingSyncJobId || !pendingSyncJob) return

    const isDone =
      pendingSyncJob.status === 'succeeded' || pendingSyncJob.status === 'failed'
    if (!isDone) {
      if (
        pollStartedAtRef.current &&
        Date.now() - pollStartedAtRef.current > SYNC_POLL_TIMEOUT_MS
      ) {
        setPendingSyncJobId(null)
        pollStartedAtRef.current = null
      }
      return
    }
    if (completedJobIdRef.current === pendingSyncJobId) return

    completedJobIdRef.current = pendingSyncJobId
    queryClient.invalidateQueries({ queryKey: ['analysis-job', 'instagram_sync'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-growth'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-pillars'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-videos'] })
    queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] })
    refreshDashboardData()
    setPendingSyncJobId(null)
    pollStartedAtRef.current = null
  }, [pendingSyncJobId, pendingSyncJob, queryClient])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const metricCards = [
    { 
      name: 'Total Views', 
      help: METRIC_HELP.totalViews,
      value: stats ? formatNumber(stats.total_views) : '0', 
      change: stats?.views_change || '0%', 
      icon: Eye 
    },
    { 
      name: 'Average Reach', 
      help: METRIC_HELP.averageReach,
      value: stats ? formatNumber(stats.avg_reach) : '0', 
      change: stats?.reach_change || '0%', 
      icon: Users 
    },
    { 
      name: 'Avg. Engagement', 
      help: METRIC_HELP.avgEngagement,
      value: stats ? `${stats.avg_engagement}%` : '0%', 
      change: stats?.engagement_change || '0%', 
      icon: TrendingUp 
    },
    { 
      name: 'Top Hook Score', 
      help: METRIC_HELP.topHookScore,
      value: stats ? `${Math.round(stats.top_hook_score)}/100` : '0/100', 
      subtitle: stats?.top_analysis_confidence
        ? `AI confidence: ${Math.round(stats.top_analysis_confidence)}%`
        : undefined,
      confidenceHelp: METRIC_HELP.aiConfidence,
      change: formatHookPointChange(stats?.hook_change, Boolean(stats?.top_hook_score)), 
      icon: Target 
    },
  ]

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Welcome back, <span className="text-primary">{account?.username || 'Creator'}</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            {syncInProgress
              ? 'Syncing your Reels from Instagram...'
              : account?.last_synced_at
                ? `Last synced ${formatLastSynced(account.last_synced_at)}`
                : 'No sync yet — run New Analysis to import your Reels.'}
          </p>
          {showSyncFailure && syncJob?.error_message && (
            <p className="mt-2 text-sm text-red-400">
              Latest sync attempt failed: {formatSyncError(syncJob.error_message)}
            </p>
          )}
        </div>
        <Button 
          onClick={handleSync}
          disabled={syncInProgress}
          className="h-11 px-6 font-bold shadow-lg shadow-primary/20 flex items-center transition-colors shrink-0"
        >
          {syncInProgress ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Plus className="mr-2 h-5 w-5" />
          )}
          <div>{syncInProgress ? 'Syncing...' : 'New Analysis'}</div>
        </Button>
      </div>

      {account?.niche_confirmed && (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#09090b] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
              <Tag className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Content niche
              </p>
              <p className="text-sm font-semibold text-white truncate" title={account.niche_confirmed}>
                {account.niche_confirmed}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5 hidden sm:block">
                Used for competitor discovery and market benchmarks
              </p>
            </div>
          </div>
          <Link href="/settings?tab=account#content-niche" className="shrink-0">
            <Button variant="outline" size="sm" className="w-full sm:w-auto border-white/10 font-semibold">
              Edit niche
            </Button>
          </Link>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-white/5 bg-[#09090b] animate-pulse" />
          ))
        ) : (
          metricCards.map((stat) => (
            <div 
              key={stat.name}
              className="group relative rounded-2xl border border-white/[0.06] bg-[#09090b] p-6 transition-[border-color,background-color,box-shadow] duration-200 ease-out hover:border-orange-500/15 hover:bg-[#0b0b0d] hover:shadow-[0_0_0_1px_rgba(249,115,22,0.06),0_12px_32px_-16px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-white/[0.04] p-2.5 transition-colors duration-200 group-hover:bg-white/[0.06]">
                  <stat.icon className="h-5 w-5 text-zinc-500 transition-colors duration-200 group-hover:text-zinc-300" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  getMetricChangeTone(stat.change)
                )}>
                  {stat.change}
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
              
              <div className="mt-5">
                <div className="text-sm font-medium text-muted-foreground">
                  <MetricLabel label={stat.name} help={stat.help} />
                </div>
                <h3 className="mt-1 text-3xl font-bold tracking-tight text-white">{stat.value}</h3>
                {'subtitle' in stat && stat.subtitle && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    <MetricLabel label={stat.subtitle} help={'confidenceHelp' in stat ? stat.confidenceHelp : undefined} />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Growth Chart Area */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-[#09090b] p-6 sm:p-8 min-h-[400px]">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Views vs. Reach
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Total views and reach per day — flat lines mean counts held steady between syncs
                </p>
              </div>
              <div className="flex items-center gap-5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#f97316]" />
                  <span className="text-zinc-400">Views</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-zinc-300" />
                  <span className="text-zinc-400">Reach</span>
                </div>
              </div>
            </div>
            <div className="h-[280px] w-full">
                {growth?.data && growth.data.length > 0 ? (
                  <GrowthChart data={growth.data} />
                ) : (
                  <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02]">
                    <p className="text-sm text-zinc-500 text-center px-8 max-w-sm">
                      Sync again after posting more Reels to build a trend line here.
                    </p>
                  </div>
                )}
            </div>
        </div>
        
        {/* Competitors Sidebar */}
        <div className="rounded-2xl border border-white/5 bg-[#09090b] p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Users2 className="h-4 w-4 text-primary" />
                Tracked Competitors
              </h3>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {competitors?.length || 0}
              </span>
            </div>
            
            <div className="space-y-4">
              {isLoadingCompetitors ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                      <div className="h-3 w-16 rounded bg-white/10 animate-pulse" />
                    </div>
                  </div>
                ))
              ) : isCompetitorsError ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
                  We couldn’t load your tracked competitors right now.
                </div>
              ) : (competitors || []).length > 0 ? (
                <>
                  {(competitors || []).slice(0, 5).map((comp) => {
                    const displayHandle = comp.handle || comp.display_name || 'Competitor'

                    return (
                      <div key={comp.id} className="flex items-center gap-3 group">
                        <div className="h-10 w-10 rounded-full border border-white/10 overflow-hidden flex-shrink-0">
                          <CompetitorAvatar
                            competitorId={comp.id}
                            handle={displayHandle}
                            className="h-full w-full"
                            iconClassName="h-4 w-4"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">@{displayHandle}</p>
                          <p className="text-xs text-muted-foreground">{formatNumber(comp.followers_count || 0)} followers</p>
                        </div>
                      </div>
                    )
                  })}
                  {(competitors || []).length > 5 && (
                    <p className="text-xs text-muted-foreground">+{(competitors || []).length - 5} more tracked</p>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {account ? 'No competitors discovered yet. Complete analysis to build your watchlist.' : 'Connect your account to discover competitors.'}
                  </p>
                </div>
              )}
            </div>
            
            <Link href="/competitors" className="block">
              <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-xs font-bold h-10">
                Manage Competitors
              </Button>
            </Link>
        </div>
      </div>

      {/* Content Pillars Section */}
      <div className="space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">High-Performing Content Pillars</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingPillars ? (
              [1,2,3].map(i => (
                <div key={i} className="h-32 rounded-2xl border border-white/5 bg-[#09090b] animate-pulse" />
              ))
            ) : pillars?.data?.length ? (
              pillars.data.map((item, i) => (
                <div key={i} className="rounded-2xl border border-white/[0.06] bg-[#09090b] p-6 transition-[border-color,background-color,box-shadow] duration-200 ease-out hover:border-orange-500/15 hover:bg-[#0b0b0d] hover:shadow-[0_0_0_1px_rgba(249,115,22,0.06),0_12px_32px_-16px_rgba(0,0,0,0.55)]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Pillar {i+1}</span>
                    <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">
                      <MetricLabel label={`${item.avg_engagement}% Eng.`} help={METRIC_HELP.pillarEngagement} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 capitalize">{item.pillar}</h3>
                  <p className="text-sm text-muted-foreground">
                    Analyzed in {item.count} of your recent Reels.
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-2xl border border-white/5 bg-[#09090b] p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No content pillars available yet. Publish more Reels or wait for the analysis pipeline to complete.
                </p>
              </div>
            )}
          </div>
      </div>

      {/* Recent Reels Grid */}
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* <Video className="h-6 w-6 text-primary" /> */}
            <h2 className="text-2xl font-bold text-white">Recent Reel Performance</h2>
          </div>
          <Link href="/videos">
            <Button variant="ghost" className="text-primary font-bold hover:bg-primary/10 flex items-center gap-2">
              <div>View All Reels</div> <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {isLoadingVideos ? (
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[9/16] rounded-xl border border-white/5 bg-[#09090b] animate-pulse" />
            ))
          ) : videos?.data && videos.data.length > 0 ? (
            videos.data.map((video) => (
            <Link 
              href={`/videos/${video.id}`} 
              key={video.id} 
              className="group relative aspect-[9/16] overflow-hidden rounded-xl border border-white/5 bg-zinc-900 transition-all hover:border-primary/50 cursor-pointer"
            >
               <ReelThumbnail
                thumbnailUrl={video.thumbnail_url}
                alt={video.caption || 'Reel'}
                className="h-full w-full opacity-60 transition-transform duration-500 group-hover:scale-110 group-hover:opacity-100"
              />
              
              {/* Stats Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-4 flex flex-col justify-end">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                    video.hook_score >= 80 ? "bg-emerald-500 text-black" : "bg-primary text-black"
                  )}>
                    Hook: {video.hook_score}
                  </div>
                </div>
                <div className="flex items-center justify-between text-white font-bold text-sm">
                  <div className="flex items-center gap-1">
                    <Play className="h-3 w-3 fill-current" />
                    {formatNumber(video.views)}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {video.engagement_rate}% Eng.
                  </div>
                </div>
              </div>
            </Link>
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-[#09090b] p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No Reels yet. Run New Analysis after connecting Instagram to import your content.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
