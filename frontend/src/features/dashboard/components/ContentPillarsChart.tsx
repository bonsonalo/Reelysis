'use client'

import { cn } from '@/lib/utils'

type PillarDatum = {
  pillar: string
  count: number
  avg_engagement: number | string
}

type ContentPillarsChartProps = {
  data: PillarDatum[]
}

/** Content themes and the engagement they drive, as a standard table. */
export function ContentPillarsChart({ data }: ContentPillarsChartProps) {
  const rows = [...data]
    .map((d) => ({ ...d, engagement: Number(d.avg_engagement) || 0 }))
    .sort((a, b) => b.engagement - a.engagement)
  const top = Math.max(...rows.map((r) => r.engagement), 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs font-medium text-text-tertiary">
            <th className="py-2.5 pr-4 font-medium">Theme</th>
            <th className="w-16 py-2.5 px-3 text-right font-medium sm:w-24 sm:px-4">Reels</th>
            <th className="w-32 py-2.5 pl-3 text-right font-medium sm:w-64 sm:pl-4">
              Avg. engagement
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="py-3 pr-4 font-medium capitalize text-foreground">
                {row.pillar}
              </td>
              <td className="py-3 px-4 text-right tabular-nums text-text-label">
                {row.count}
              </td>
              <td className="py-3 pl-3 sm:pl-4">
                <div className="flex items-center justify-end gap-3">
                  <div className="hidden h-1.5 w-full max-w-[160px] rounded-full bg-surface-hover sm:block" aria-hidden>
                    <div
                      className={cn('h-full rounded-full', i === 0 ? 'bg-primary' : 'bg-[#9aa0ab]')}
                      style={{ width: `${top > 0 ? (row.engagement / top) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-medium tabular-nums text-foreground">
                    {row.avg_engagement}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
