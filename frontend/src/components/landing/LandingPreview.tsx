import { ArrowUpRight, Check } from 'lucide-react'
import { BrandMark } from '@/components/shared/BrandLogo'

/** Static Reel analysis for the marketing hero — illustrative data, not a live account. */
const reel = {
  caption: 'Stop doing crunches. Do this instead',
  hookScore: 87,
  stats: [
    { label: 'Views', value: '48.2K', change: '+18%' },
    { label: 'Reach', value: '31.9K', change: '+11%' },
    { label: 'Engagement', value: '6.4%', change: '+1.2 pts' },
  ],
  worked: [
    'Names the mistake in the first second, before the viewer can scroll.',
    'One specific swap instead of a full routine keeps the promise small.',
  ],
}

const library = [
  { caption: '3 mistakes killing your squat depth', score: 82, views: '36.4K' },
  { caption: 'What I eat in a day to build muscle', score: 64, views: '21.0K' },
  { caption: 'Morning mobility flow for desk workers', score: 41, views: '9.8K' },
]

function scoreTone(score: number) {
  if (score >= 80) return 'bg-success-tint text-success'
  if (score < 50) return 'bg-surface-hover text-text-secondary'
  return 'bg-warning-tint text-warning'
}

/** The first seconds of the Reel, marked on its timeline: the window a hook score rates. */
function ReelFrame() {
  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-[#1d2026]">
      <p className="absolute inset-x-2.5 top-[38%] text-center">
        <span className="box-decoration-clone rounded-[3px] bg-white px-1.5 py-0.5 text-[12px] font-bold leading-[1.7] text-[#17191f] sm:text-[13px]">
          {reel.caption}
        </span>
      </p>
      <p className="absolute inset-x-3 bottom-9 truncate text-[11px] text-white/70">
        @fitcoach · Original audio
      </p>
      <div className="absolute inset-x-3 bottom-4 flex h-1 gap-0.5" aria-hidden>
        <span className="w-[16%] rounded-full bg-primary" />
        <span className="flex-1 rounded-full bg-white/30" />
      </div>
      <span className="absolute left-3 top-3 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
        0:00–0:03
      </span>
    </div>
  )
}

export function LandingPreview() {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-subtle p-2 sm:p-3">
      <div
        className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-overlay"
        aria-label="Example Reel analysis in Reelysis"
        role="img"
      >
        <div className="flex h-10 items-center justify-between gap-3 border-b border-border-subtle px-4 text-[12px]">
          <div className="flex min-w-0 items-center gap-2 text-text-tertiary">
            <BrandMark className="h-4 w-4 shrink-0" />
            <span>Reels</span>
            <span aria-hidden>/</span>
            <span className="truncate text-text-label">{reel.caption}</span>
          </div>
          <span className="hidden shrink-0 items-center gap-1 text-text-tertiary sm:inline-flex">
            Open on Instagram
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>

        <div className="grid grid-cols-[96px_1fr] gap-4 p-4 sm:grid-cols-[148px_1fr] sm:gap-5 sm:p-5">
          <ReelFrame />

          <div className="min-w-0">
            <p className="text-[12px] text-text-tertiary">Hook score</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">
                {reel.hookScore}
              </span>
              <span className="text-sm text-text-tertiary">/100</span>
              <span className="ml-2 rounded-full bg-success-tint px-2 py-0.5 text-[11px] font-medium text-success">
                Strong opener
              </span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${reel.hookScore}%` }}
              />
            </div>

            <p className="mt-4 border-l-2 border-border-strong pl-3 text-[13px] leading-relaxed text-text-label">
              &ldquo;{reel.caption}.&rdquo;
            </p>

            <dl className="mt-4 hidden grid-cols-3 divide-x divide-border-subtle rounded-lg border border-border-subtle sm:grid">
              {reel.stats.map((stat) => (
                <div key={stat.label} className="px-3 py-2.5">
                  <dt className="text-[11px] text-text-tertiary">{stat.label}</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-foreground">
                    {stat.value}
                  </dd>
                  <dd className="text-[11px] tabular-nums text-success">{stat.change}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 hidden lg:block">
              <p className="text-[12px] font-medium text-text-label">What worked</p>
              <ul className="mt-2 space-y-1.5">
                {reel.worked.map((item) => (
                  <li key={item} className="flex gap-2 text-[12.5px] leading-snug text-text-secondary">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-border-subtle">
          <div className="flex items-center justify-between px-4 pb-1.5 pt-3 text-[11px] text-text-tertiary sm:px-5">
            <span>Other Reels</span>
            <span className="tabular-nums">Views</span>
          </div>
          <ul className="pb-2">
            {library.map((item) => (
              <li
                key={item.caption}
                className="flex items-center gap-3 px-4 py-1.5 text-[12.5px] sm:px-5"
              >
                <span
                  className={`w-9 shrink-0 rounded px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums ${scoreTone(item.score)}`}
                >
                  {item.score}
                </span>
                <span className="min-w-0 flex-1 truncate text-text-label">{item.caption}</span>
                <span className="shrink-0 tabular-nums text-text-secondary">{item.views}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
