/** Static dashboard preview for the marketing page — not live data. */
export function LandingPreview() {
  const stats = [
    { label: 'Total views', value: '1.7M', change: '+12%' },
    { label: 'Avg. engagement', value: '4.2%', change: '+0.8%' },
    { label: 'Top hook score', value: '87/100', change: '+5 pts' },
  ]

  return (
    <div className="mt-10 w-full overflow-hidden rounded-[10px] border border-border-subtle bg-surface-card p-1 sm:mt-14 md:mt-16">
      <div className="overflow-hidden rounded-[8px] border border-border-subtle bg-surface-sidebar">
        <div className="flex items-center gap-2 border-b border-border-subtle bg-surface-page px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-zinc-700" />
          <span className="h-2 w-2 rounded-full bg-zinc-700" />
          <span className="h-2 w-2 rounded-full bg-zinc-700" />
          <span className="ml-2 truncate text-xs text-text-tertiary">reelysis.app/dashboard</span>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[10px] border border-border-subtle bg-surface-input px-4 py-4 text-left"
            >
              <p className="text-sm text-text-secondary">{stat.label}</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-white sm:text-2xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-text-tertiary">{stat.change}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-border-subtle bg-surface-page/50 px-4 py-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between text-xs text-text-tertiary">
            <span>Views vs reach</span>
            <span className="text-primary">Views</span>
          </div>
          <div className="flex h-24 items-end gap-1">
            {[40, 55, 45, 70, 60, 85, 75, 90].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-primary/80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
