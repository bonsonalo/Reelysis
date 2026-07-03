'use client'

import { useCompetitors, useRemoveCompetitor, useRediscoverCompetitors, useResyncCompetitors } from '@/features/competitors/hooks/useCompetitors'
import { useAnalysisJobById } from '@/features/instagram/hooks/useAnalysisJob'
import { AddCompetitorForm } from '@/features/competitors/components/AddCompetitorForm'
import { CompetitorAvatar } from '@/features/competitors/components/CompetitorAvatar'
import { competitorEngagementBarWidth, formatCompetitorEngagement, shouldShowCompetitorEngagement } from '@/features/competitors/utils'
import { 
  Users2, 
  Trash2, 
  TrendingUp, 
  ExternalLink,
  Search,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export default function CompetitorsPage() {
  const queryClient = useQueryClient()
  const [pendingJobId, setPendingJobId] = useState<string | null>(null)
  const completedJobIdRef = useRef<string | null>(null)

  const pollWhileActive = (query: { state: { data?: { status?: string } | null } }) => {
    const status = query.state.data?.status
    return status === 'queued' || status === 'running' ? 3000 : false
  }

  const { data: pendingJob } = useAnalysisJobById(pendingJobId, {
    refetchInterval: pollWhileActive,
  })
  const discoveryInProgress =
    !!pendingJobId &&
    (!pendingJob || pendingJob.status === 'queued' || pendingJob.status === 'running')

  const { data: competitors, isLoading, refetch: refetchCompetitors } = useCompetitors({
    refetchInterval: discoveryInProgress ? 5000 : false,
  })
  const { mutate: removeCompetitor, isPending: isRemoving } = useRemoveCompetitor()
  const { mutate: refreshSuggestions, isPending: isRefreshing } = useRediscoverCompetitors()
  const { mutate: resyncProfiles, isPending: isResyncing } = useResyncCompetitors()
  
  const [searchQuery, setSearchQuery] = useState('')
  const jobInProgress = discoveryInProgress || isRefreshing || isResyncing
  const isResyncJob = pendingJob?.job_type === 'competitor_resync'

  useEffect(() => {
    if (!pendingJobId || !pendingJob) return
    const isDone = pendingJob.status === 'succeeded' || pendingJob.status === 'failed'
    if (!isDone || completedJobIdRef.current === pendingJobId) return
    completedJobIdRef.current = pendingJobId
    queryClient.invalidateQueries({ queryKey: ['competitors'] })
    queryClient.invalidateQueries({ queryKey: ['analysis-job', 'competitor_discovery'] })
    refetchCompetitors()
    setPendingJobId(null)
  }, [pendingJobId, pendingJob, queryClient, refetchCompetitors])

  const startJob = (jobId?: string) => {
    if (jobId) setPendingJobId(String(jobId))
  }

  const handleRefreshSuggestions = () => {
    if (jobInProgress) return
    refreshSuggestions(undefined, { onSuccess: (data) => startJob(data?.job_id) })
  }

  const handleResyncProfiles = () => {
    if (jobInProgress || !competitors?.length) return
    resyncProfiles(undefined, { onSuccess: (data) => startJob(data?.job_id) })
  }

  const filteredCompetitors = competitors?.filter(c => 
    c.handle.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Users2 className="h-8 w-8 text-primary" />
            Market Intelligence
          </h1>
          <p className="mt-1 text-muted-foreground">
            {discoveryInProgress
              ? isResyncJob
                ? 'Refreshing follower counts and profile stats — batch scrape can take up to ~10 minutes. You can stay on this page or come back.'
                : 'Finding new competitor accounts for your niche — batch scrape can take up to ~10 minutes.'
              : `Tracking ${competitors?.length || 0} top-performing accounts in your niche.`}
          </p>
          {pendingJob?.status === 'failed' && pendingJob.error_message && (
            <p className="mt-2 text-sm text-red-400">{pendingJob.error_message}</p>
          )}
        </div>
        
        <div className="relative w-full md:w-80 group">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
           <input 
            type="text" 
            placeholder="Search accounts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl border border-white/5 bg-[#09090b] text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-all"
           />
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[#09090b] p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Add a competitor</h2>
            <p className="text-sm text-zinc-500">Track any public Instagram account by handle (max 10).</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={handleRefreshSuggestions}
              disabled={jobInProgress}
              className="border-white/10"
              title="Ask Gemini for a new list of competitor handles"
            >
              {jobInProgress && !isResyncJob ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh suggestions
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleResyncProfiles}
              disabled={jobInProgress || !competitors?.length}
              className="border-white/10"
              title="Update follower counts for your current list (one batch job; may take up to ~10 min)"
            >
              {jobInProgress && isResyncJob ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Re-sync profiles'
              )}
            </Button>
          </div>
        </div>
        <AddCompetitorForm />
      </div>

      {/* Competitors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompetitors?.map((comp) => (
          <div 
            key={comp.id} 
            className="group relative rounded-3xl border border-white/5 bg-[#09090b] p-8 space-y-6 hover:border-primary/20 transition-all hover:bg-[#0c0c0e] hover:shadow-2xl hover:shadow-primary/5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl border border-white/10 overflow-hidden">
                  <CompetitorAvatar
                    competitorId={comp.id}
                    handle={comp.handle}
                    className="h-full w-full"
                    iconClassName="h-8 w-8"
                  />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-white truncate max-w-[150px]">@{comp.handle}</h3>
                   <p className="text-sm text-zinc-500 truncate max-w-[150px]">{comp.display_name}</p>
                </div>
              </div>
              
              <button 
                onClick={() => removeCompetitor(comp.id)}
                className="p-2 rounded-lg text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Stop tracking"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="rounded-2xl bg-white/[0.03] p-4 border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Followers</p>
                  <p className="text-xl font-bold text-white">{formatNumber(comp.followers_count)}</p>
               </div>
               <div className="rounded-2xl bg-emerald-500/5 p-4 border border-emerald-500/10">
                  <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mb-1">Market Rank</p>
                  <div className="flex items-center gap-1.5">
                     <TrendingUp className="h-4 w-4 text-emerald-500" />
                     <p className="text-xl font-bold text-white">Top 5%</p>
                  </div>
               </div>
            </div>

            <div className="space-y-3 pt-2">
               <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-500">
                  <span>Avg. engagement</span>
                  <span className="text-primary">
                    {shouldShowCompetitorEngagement(comp.followers_count, comp.engagement_rank)
                      ? `${formatCompetitorEngagement(comp.engagement_rank)}%`
                      : '—'}
                  </span>
               </div>
               <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000" 
                    style={{
                      width: `${shouldShowCompetitorEngagement(comp.followers_count, comp.engagement_rank)
                        ? competitorEngagementBarWidth(comp.engagement_rank)
                        : 0}%`,
                    }} 
                  />
               </div>
               {comp.followers_count > 0 && comp.followers_count < 10000 && (
                 <p className="text-[10px] text-zinc-600 leading-snug">
                   Engagement % is hidden below 10k followers — small accounts aren&apos;t comparable to large peers.
                 </p>
               )}
            </div>

            <a 
              href={`https://instagram.com/${comp.handle}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border border-white/10 text-zinc-400 font-bold text-sm hover:bg-white/5 hover:text-white transition-all"
            >
              Visit Profile <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ))}

        {(!filteredCompetitors || filteredCompetitors.length === 0) && !isLoading && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-bold text-white">No competitors tracked yet</h3>
            <p className="text-zinc-500 mt-2">Add a handle above, refresh suggestions, or re-sync existing profiles.</p>
          </div>
        )}
      </div>
    </div>
  )
}
