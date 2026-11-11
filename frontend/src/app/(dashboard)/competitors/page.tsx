'use client'

import { useCompetitors, useRemoveCompetitor, useRediscoverCompetitors } from '@/features/competitors/hooks/useCompetitors'
import { useAnalysisJobById } from '@/features/instagram/hooks/useAnalysisJob'
import { AddCompetitorForm } from '@/features/competitors/components/AddCompetitorForm'
import { CompetitorAvatar } from '@/features/competitors/components/CompetitorAvatar'
import { formatCompetitorEngagement, shouldShowCompetitorEngagement } from '@/features/competitors/utils'
import { getCompetitorDiscoveryUi } from '@/features/jobs/utils/jobProgressUtils'
import { ButtonLoadingLabel } from '@/components/shared/ButtonLoadingLabel'
import { CompetitorsPageSkeleton } from '@/components/shared/PageSkeletons'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { ProcessStatus } from '@/components/shared/ProcessStatus'
import { Button } from '@/components/ui/button'
import { Panel, PageHeader } from '@/components/shared/Panel'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { inputClassName } from '@/components/auth/AuthField'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

function formatNumber(num: number) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

function RemoveCompetitorButton({
  handle,
  onRemove,
  className,
}: {
  handle: string
  onRemove: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className={cn(
        'shrink-0 rounded-md p-1.5 text-text-tertiary transition-[color,background-color,opacity] duration-150 hover:bg-danger-tint hover:text-danger',
        className,
      )}
      aria-label={`Stop tracking @${handle}`}
      title="Stop tracking"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

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
  const { mutate: removeCompetitor } = useRemoveCompetitor()
  const { mutate: refreshSuggestions, isPending: isRefreshing } = useRediscoverCompetitors()

  const [searchQuery, setSearchQuery] = useState('')
  const jobInProgress = discoveryInProgress || isRefreshing

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

  const handleRefreshSuggestions = () => {
    if (jobInProgress) return
    refreshSuggestions(undefined, {
      onSuccess: (data) => {
        if (data?.job_id) setPendingJobId(String(data.job_id))
      },
    })
  }

  const filteredCompetitors = competitors?.filter(
    (c) =>
      c.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.display_name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const discoveryUi = getCompetitorDiscoveryUi(
    pendingJob?.progress ?? 0,
    pendingJob?.status ?? (isRefreshing ? 'queued' : undefined),
  )

  if (isLoading) {
    return <CompetitorsPageSkeleton />
  }

  const competitorCount = competitors?.length ?? 0
  const filteredCount = filteredCompetitors?.length ?? 0

  return (
    <div className="space-y-6 pb-16 sm:space-y-8">
      <PageHeader
        title="Competitors"
        description={
          <>
            <p>
              Public Instagram accounts you track to benchmark content and engagement.
              {competitorCount > 0 && (
                <span className="text-text-tertiary">
                  {' '}
                  {competitorCount} of 10 tracked.
                </span>
              )}
            </p>
            {pendingJob?.status === 'failed' && pendingJob.error_message && !jobInProgress && (
              <p className="mt-1.5 text-danger">{pendingJob.error_message}</p>
            )}
          </>
        }
      />

      {jobInProgress && (
        <ProcessStatus
          statusText={discoveryUi.description}
          tasks={discoveryUi.tasks}
          errorMessage={
            pendingJob?.status === 'failed' ? pendingJob.error_message : undefined
          }
        />
      )}

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border-subtle px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Add competitor</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Track any public account by handle (max 10).
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshSuggestions}
            disabled={jobInProgress}
            className="shrink-0"
          >
            <ButtonLoadingLabel loading={jobInProgress} loadingLabel="Refreshing…">
              Refresh suggestions
            </ButtonLoadingLabel>
          </Button>
        </div>
        <div className="px-4 py-4 sm:px-6">
          <AddCompetitorForm />
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border-subtle px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Tracked accounts</h2>
            {searchQuery && filteredCount !== competitorCount && (
              <p className="mt-1 text-sm text-text-secondary">
                {filteredCount} of {competitorCount} shown
              </p>
            )}
          </div>
          <input
            type="text"
            placeholder="Search by handle or name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(inputClassName, 'sm:max-w-xs')}
          />
        </div>

        {!filteredCompetitors || filteredCompetitors.length === 0 ? (
          <PageEmptyState
            className="px-4 sm:px-6"
            primary={
              searchQuery
                ? 'No accounts match your search.'
                : 'No competitors tracked yet. Add a handle above or refresh suggestions.'
            }
          />
        ) : (
          <>
            <div className="divide-y divide-border-subtle md:hidden">
              {filteredCompetitors.map((comp) => {
                const showEngagement = shouldShowCompetitorEngagement(
                  comp.followers_count,
                  comp.engagement_rank,
                )
                const notSynced = !comp.followers_count && !comp.media_count

                return (
                  <div
                    key={comp.id}
                    className="flex items-center gap-3 px-4 py-4 sm:px-6"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      <CompetitorAvatar
                        competitorId={comp.id}
                        handle={comp.handle}
                        className="h-full w-full"
                        iconClassName="h-4 w-4"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <a
                        href={`https://instagram.com/${comp.handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate font-medium text-foreground transition-colors duration-150 hover:text-brand-text"
                      >
                        @{comp.handle}
                      </a>
                      <p className="mt-1 text-xs tabular-nums text-text-secondary">
                        {notSynced ? (
                          'Profile not synced yet'
                        ) : (
                          <>
                            {formatNumber(comp.followers_count)} followers, {comp.media_count ?? 0}{' '}
                            Reels
                            {showEngagement &&
                              `, ${formatCompetitorEngagement(comp.engagement_rank)}% engagement`}
                          </>
                        )}
                      </p>
                    </div>
                    <RemoveCompetitorButton
                      handle={comp.handle}
                      onRemove={() => removeCompetitor(comp.id)}
                    />
                  </div>
                )
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-subtle text-left text-xs font-medium text-text-tertiary">
                  <th className="py-3 pl-6 pr-4 font-medium">Account</th>
                  <th className="w-28 px-4 py-3 text-right font-medium">Followers</th>
                  <th className="w-24 px-4 py-3 text-right font-medium">Reels</th>
                  <th className="w-36 px-4 py-3 text-right font-medium">Avg. engagement</th>
                  <th className="w-16 py-3 pl-4 pr-6 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredCompetitors.map((comp) => {
                  const showEngagement = shouldShowCompetitorEngagement(
                    comp.followers_count,
                    comp.engagement_rank,
                  )
                  const notSynced = !comp.followers_count && !comp.media_count

                  return (
                    <tr
                      key={comp.id}
                      className="group transition-colors duration-150 hover:bg-surface-subtle"
                    >
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                            <CompetitorAvatar
                              competitorId={comp.id}
                              handle={comp.handle}
                              className="h-full w-full"
                              iconClassName="h-3.5 w-3.5"
                            />
                          </div>
                          <div className="min-w-0">
                            <a
                              href={`https://instagram.com/${comp.handle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate font-medium text-foreground transition-colors duration-150 hover:text-brand-text"
                            >
                              @{comp.handle}
                            </a>
                            {notSynced ? (
                              <p className="truncate text-xs text-text-tertiary">
                                Profile not synced yet
                              </p>
                            ) : (
                              comp.display_name &&
                              comp.display_name !== comp.handle && (
                                <p className="truncate text-xs text-text-secondary">
                                  {comp.display_name}
                                </p>
                              )
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-text-label">
                        {notSynced ? '—' : formatNumber(comp.followers_count)}
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-text-label">
                        {notSynced ? '—' : (comp.media_count ?? '—')}
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-foreground">
                        {showEngagement
                          ? `${formatCompetitorEngagement(comp.engagement_rank)}%`
                          : '—'}
                      </td>
                      <td className="py-4 pl-4 pr-6 text-right">
                        <RemoveCompetitorButton
                          handle={comp.handle}
                          onRemove={() => removeCompetitor(comp.id)}
                          className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </>
        )}

        {competitorCount > 0 && (
          <p className="border-t border-border-subtle px-4 py-3 text-xs leading-relaxed text-text-tertiary sm:px-6">
            Avg. engagement is hidden for accounts under 10k followers. Small accounts
            aren&apos;t comparable to larger peers.
          </p>
        )}
      </Panel>
    </div>
  )
}
