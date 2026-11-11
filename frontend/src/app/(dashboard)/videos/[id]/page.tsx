'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useVideoAnalysis } from '@/features/dashboard/hooks/useVideoAnalysis'
import { ReelThumbnail } from '@/features/dashboard/components/ReelThumbnail'
import { ArrowLeft, ArrowUpRight, AlertCircle, Check, CornerDownRight, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MetricLabel } from '@/components/shared/MetricInfoTip'
import { METRIC_HELP } from '@/features/dashboard/constants/metricHelp'
import { Panel } from '@/components/shared/Panel'
import { AiInsightsPending } from '@/features/dashboard/components/AiInsightsPending'
import { cn, isNotFoundError, stripTrailingHashtags } from '@/lib/utils'
import { PageErrorState } from '@/components/shared/PageErrorState'

function formatNumber(num: number) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

function hookScoreTone(score: number) {
  if (score >= 80) return 'text-success'
  if (score < 50) return 'text-text-secondary'
  return 'text-foreground'
}

function StatCell({
  label,
  help,
  value,
  valueClassName,
}: {
  label: string
  help?: (typeof METRIC_HELP)[keyof typeof METRIC_HELP]
  value: string
  valueClassName?: string
}) {
  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <div className="text-xs text-text-secondary sm:text-sm">
        <MetricLabel label={label} help={help} tipSide="top" />
      </div>
      <p
        className={cn(
          'mt-1.5 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl',
          valueClassName ?? 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function InsightSection({
  title,
  description,
  items,
  icon: Icon,
  iconClassName,
}: {
  title: string
  description: string
  items: string[]
  icon: LucideIcon
  iconClassName: string
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-border-subtle px-4 py-4 sm:px-6 md:py-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold text-foreground md:text-base">{title}</h2>
          {items.length > 0 && (
            <span className="shrink-0 text-xs tabular-nums text-text-tertiary">
              {items.length}
            </span>
          )}
        </div>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-text-secondary md:text-sm">
          {description}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-text-tertiary sm:px-6 md:py-8">
          Nothing noted for this reel.
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex gap-3.5 px-4 py-4 sm:gap-4 sm:px-6 sm:py-[1.125rem] md:py-5"
            >
              <Icon className={cn('mt-1 h-4 w-4 shrink-0', iconClassName)} aria-hidden />
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-text-label md:text-[15px]">
                {item}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export default function VideoDetailPage() {
  const params = useParams()
  const videoId = params.id as string

  const { data, isLoading, error, isRefetching, refetch } = useVideoAnalysis(videoId)

  if (isLoading) {
    return (
      <div className="space-y-6 pb-16 md:space-y-8 md:pb-20">
        <div className="border-b border-border-subtle pb-6 md:pb-8">
          <div className="mb-5 h-4 w-24 animate-pulse rounded bg-surface-pressed" />
          <div className="h-7 w-2/3 max-w-lg animate-pulse rounded bg-surface-pressed" />
          <div className="mt-3 h-4 w-40 animate-pulse rounded bg-surface-hover" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,232px)_1fr] lg:gap-8 xl:grid-cols-[minmax(0,248px)_1fr]">
          <div className="mx-auto aspect-[9/16] w-full max-w-[220px] animate-pulse rounded-[10px] bg-surface-card sm:max-w-[260px] lg:mx-0 lg:max-w-none" />
          <div className="space-y-4">
            <div className="h-[120px] animate-pulse rounded-[10px] bg-surface-card" />
            <div className="h-[200px] animate-pulse rounded-[10px] bg-surface-card" />
            <div className="h-[240px] animate-pulse rounded-[10px] bg-surface-card" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !isNotFoundError(error)) {
    return (
      <PageErrorState
        title="Couldn’t load this reel"
        onRetry={() => refetch()}
        retrying={isRefetching}
      />
    )
  }

  if (!data?.media) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-text-tertiary" />
        <h2 className="text-base font-semibold text-foreground">Reel not found</h2>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">
          This reel may have been removed or is no longer synced to your account.
        </p>
        <Link href="/videos" className="mt-6">
          <Button>Back to Reels</Button>
        </Link>
      </div>
    )
  }

  const { media, analysis, metrics } = data
  const detail = analysis?.analysis_detail
  const views = metrics?.view ?? 0
  const hookScore = analysis?.hook_score ?? 0
  // Same definition as the Reels list and dashboard: interactions / reach, from the latest sync.
  const reach = metrics?.reach ?? 0
  const engagement =
    reach > 0
      ? Math.round(((metrics?.total_interactions ?? 0) / reach) * 1000) / 10
      : (analysis?.engagement_score ?? 0)
  const confidence = analysis?.confidence ?? 0
  const caption = media.caption?.trim()
  // Trailing hashtags are noise in a page title; the full caption is shown further down.
  const title = stripTrailingHashtags(caption)
  const hasTranscript =
    Boolean(media.transcript_text) && media.transcript_source !== 'none'

  return (
    <div className="space-y-6 pb-16 md:space-y-8 md:pb-20">
      <header>
        <Link
          href="/videos"
          className="mb-5 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors duration-150 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All Reels
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-foreground md:text-2xl">
              {title || caption || 'Untitled reel'}
            </h1>
            {analysis && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
                <span className="capitalize">{analysis.content_pillar}</span>
                {detail?.pacing && (
                  <>
                    <span className="text-text-tertiary" aria-hidden>
                      ·
                    </span>
                    <span>{detail.pacing} pacing</span>
                  </>
                )}
              </p>
            )}
          </div>

          <a
            href={media.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm text-text-secondary transition-colors duration-150 hover:text-foreground"
          >
            Open on Instagram
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,232px)_1fr] lg:gap-8 xl:grid-cols-[minmax(0,248px)_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <a
            href={media.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative mx-auto block aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-[10px] border border-border-subtle bg-surface-card transition-[border-color] duration-150 hover:border-border-strong sm:max-w-[260px] lg:mx-0 lg:max-w-none"
          >
            <ReelThumbnail
              thumbnailUrl={media.thumbnail_url}
              alt={caption || 'Reel'}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/15" />
          </a>
          <p className="mt-3 hidden text-center text-xs text-text-tertiary lg:block">
            Tap to watch on Instagram
          </p>
        </aside>

        <div className="min-w-0 space-y-4 md:space-y-6">
          <Panel className="grid grid-cols-3 divide-x divide-border-subtle">
            <StatCell
              label="Views"
              help={METRIC_HELP.videoViews}
              value={formatNumber(views)}
            />
            <StatCell label="Reach" value={formatNumber(reach)} />
            <StatCell
              label="Engagement"
              help={METRIC_HELP.videoEngagement}
              value={`${engagement}%`}
            />
          </Panel>

          {analysis && (
            <Panel className="grid gap-5 p-4 sm:grid-cols-[1fr_200px] sm:gap-8 sm:p-6">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-text-label">Opening hook</p>
                <p className="mt-2 border-l-2 border-primary pl-3 text-[15px] leading-relaxed text-foreground">
                  {detail?.hook ? <>&ldquo;{detail.hook}&rdquo;</> : 'No spoken or on-screen hook was detected.'}
                </p>
              </div>
              <div className="sm:border-l sm:border-border-subtle sm:pl-8">
                <div className="text-[13px] text-text-secondary">
                  <MetricLabel label="Hook score" help={METRIC_HELP.hookScore} tipSide="top" />
                </div>
                <p className="mt-1.5 flex items-baseline gap-1">
                  <span
                    className={cn(
                      'text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums',
                      hookScoreTone(hookScore),
                    )}
                  >
                    {hookScore}
                  </span>
                  <span className="text-sm text-text-tertiary">/100</span>
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-surface-hover" aria-hidden>
                  <div
                    className={cn(
                      'h-full rounded-full',
                      hookScore >= 80 ? 'bg-green-600' : hookScore < 50 ? 'bg-text-placeholder' : 'bg-amber-500',
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, hookScore))}%` }}
                  />
                </div>
                <div className="mt-2.5 text-xs tabular-nums text-text-tertiary">
                  <MetricLabel
                    label={`${confidence}% confidence`}
                    help={METRIC_HELP.aiConfidence}
                    tipSide="top"
                  />
                </div>
              </div>
            </Panel>
          )}

          {analysis ? (
            <div className="space-y-4 md:space-y-5">
              <InsightSection
                title="What worked"
                description="Patterns that helped this reel perform"
                items={detail?.strengths ?? []}
                icon={Check}
                iconClassName="text-success"
              />
              <InsightSection
                title="Try next time"
                description="Small tweaks for your next post"
                items={detail?.weaknesses ?? []}
                icon={CornerDownRight}
                iconClassName="text-text-tertiary"
              />
            </div>
          ) : (
            <Panel className="px-4 py-8 sm:px-6">
              <AiInsightsPending />
            </Panel>
          )}

          <Panel className="overflow-hidden">
            <div className="border-b border-border-subtle px-4 py-4 sm:px-6">
              <h2 className="text-sm font-semibold text-foreground md:text-base">Caption</h2>
            </div>
            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary md:text-base">
                {caption || 'No caption on this reel.'}
              </p>
            </div>

            <div className="border-t border-border-subtle px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground md:text-base">Transcript</h2>
                {hasTranscript && media.transcript_source && (
                  <span className="text-xs text-text-tertiary">via {media.transcript_source}</span>
                )}
              </div>
              {!hasTranscript && (
                <p className="mt-1 text-xs text-text-tertiary">
                  No spoken audio detected. Analysis used caption and metrics.
                </p>
              )}
            </div>
            <div className="border-t border-border-subtle px-4 py-4 sm:px-6 sm:py-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary md:text-base">
                {hasTranscript
                  ? media.transcript_text
                  : 'Transcript not available for this reel.'}
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
