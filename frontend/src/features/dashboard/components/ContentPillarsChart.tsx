'use client'

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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs font-medium text-text-tertiary">
            <th className="py-2.5 pr-4 font-medium">Theme</th>
            <th className="w-24 py-2.5 px-4 text-right font-medium">Reels</th>
            <th className="w-40 py-2.5 pl-4 text-right font-medium">
              Avg. engagement
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="py-3 pr-4 font-medium capitalize text-white">
                {row.pillar}
              </td>
              <td className="py-3 px-4 text-right tabular-nums text-text-label">
                {row.count}
              </td>
              <td className="py-3 pl-4 text-right tabular-nums font-medium text-white">
                {row.avg_engagement}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
