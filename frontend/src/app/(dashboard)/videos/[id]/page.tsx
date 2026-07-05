'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useVideoAnalysis } from '@/features/dashboard/hooks/useVideoAnalysis'
import { ReelThumbnail } from '@/features/dashboard/components/ReelThumbnail'
import { ArrowLeft, ArrowUpRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MetricLabel } from '@/components/shared/MetricInfoTip'
import { METRIC_HELP } from '@/features/dashboard/constants/metricHelp'
import { Panel } from '@/components/shared/Panel'
import { cn } from '@/lib/utils'

function formatNumber(num: number) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

function hookScoreTone(score: number) {
  if (score >= 80) return 'text-emerald-400'
  if (score < 50) return 'text-text-secondary'
  return 'text-white'
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
          valueClassName ?? 'text-white',
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
}: {
  title: string
  description: string
  items: string[]
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-border-subtle px-4 py-4 sm:px-6 md:py-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold text-white md:text-base">{title}</h2>
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
        <ol className="divide-y divide-border-subtle">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex gap-3.5 px-4 py-4 sm:gap-4 sm:px-6 sm:py-[1.125rem] md:py-5"
            >
              <span
                className="mt-[0.55rem] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-input text-[10px] font-medium tabular-nums text-text-tertiary"
                aria-hidden
              >
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 text-sm leading-[1.7] text-text-secondary md:text-[15px] md:leading-[1.75]">
                {item}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

export default function VideoDetailPage() {
  const params = useParams()
  const videoId = params.id as string

  const { data, isLoading } = useVideoAnalysis(videoId)

  if (isLoading) {
    return (
      <div className="space-y-6 pb-16 md:space-y-8 md:pb-20">
        <div className="border-b border-border-subtle pb-6 md:pb-8">
          <div className="mb-5 h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-7 w-2/3 max-w-lg animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-3 h-4 w-40 animate-pulse rounded bg-white/[0.04]" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-8 xl:grid-cols-[minmax(0,300px)_1fr]">
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

  if (!data?.media) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-text-tertiary" />
        <h2 className="text-base font-semibold text-white">Reel not found</h2>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">
          This reel may have been removed or is no longer synced to your account.
        </p>
        <Button asChild className="mt-6">
          <Link href="/videos">Back to Reels</Link>
        </Button>
      </div>
    )
  }

  const { media, analysis, metrics } = data
  const detail = analysis?.analysis_detail
  const views = metrics?.view ?? 0
  const hookScore = analysis?.hook_score ?? 0
  const engagement = analysis?.engagement_score ?? 0
  const confidence = analysis?.confidence ?? 0
  const caption = media.caption?.trim()
  const hasTranscript =
    Boolean(media.transcript_text) && media.transcript_source !== 'none'

  return (
    <div className="space-y-6 pb-16 md:space-y-8 md:pb-20">
      <header className="border-b border-border-subtle pb-6 md:pb-8">
        <Link
          href="/videos"
          className="mb-5 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors duration-150 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All Reels
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold leading-snug text-white md:text-2xl">
              {caption || 'Untitled reel'}
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
            className="inline-flex shrink-0 items-center gap-1.5 text-sm text-text-secondary transition-colors duration-150 hover:text-white"
          >
            Open on Instagram
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-8 xl:grid-cols-[minmax(0,300px)_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <a
            href={media.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative mx-auto block aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-[10px] border border-border-subtle bg-surface-card transition-[border-color] duration-150 hover:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 sm:max-w-[260px] lg:mx-0 lg:max-w-none"
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
          <Panel className="grid grid-cols-2 divide-x divide-y divide-border-subtle sm:grid-cols-4 sm:divide-y-0">
            <StatCell
              label="Views"
              help={METRIC_HELP.videoViews}
              value={formatNumber(views)}
            />
            <StatCell
              label="Engagement"
              help={METRIC_HELP.videoEngagement}
              value={`${engagement}%`}
            />
            <StatCell
              label="Hook score"
              help={METRIC_HELP.hookScore}
              value={analysis ? `${hookScore}/100` : '-'}
              valueClassName={analysis ? hookScoreTone(hookScore) : undefined}
            />
            <StatCell
              label="Confidence"
              help={METRIC_HELP.aiConfidence}
              value={analysis ? `${confidence}%` : '-'}
            />
          </Panel>

          {detail?.hook && (
            <blockquote className="border-l-2 border-primary/30 py-0.5 pl-4 text-sm leading-[1.7] text-text-secondary md:text-[15px] md:leading-[1.75]">
              <span className="mb-1.5 block text-xs font-medium text-text-label md:text-sm">
                Opening hook
              </span>
              &ldquo;{detail.hook}&rdquo;
            </blockquote>
          )}

          {analysis ? (
            <div className="space-y-4 md:space-y-5">
              <InsightSection
                title="What worked"
                description="Patterns that helped this reel perform"
                items={detail?.strengths ?? []}
              />
              <InsightSection
                title="Try next time"
                description="Small tweaks for your next post"
                items={detail?.weaknesses ?? []}
              />
            </div>
          ) : (
            <Panel className="px-4 py-10 text-center sm:px-6">
              <p className="text-sm text-text-secondary">
                Analysis isn&apos;t ready for this reel yet. Run New Analysis from the dashboard.
              </p>
            </Panel>
          )}

          <Panel className="overflow-hidden">
            <div className="border-b border-border-subtle px-4 py-4 sm:px-6">
              <h2 className="text-sm font-semibold text-white md:text-base">Caption</h2>
            </div>
            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary md:text-base">
                {caption || 'No caption on this reel.'}
              </p>
            </div>

            <div className="border-t border-border-subtle px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-white md:text-base">Transcript</h2>
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
