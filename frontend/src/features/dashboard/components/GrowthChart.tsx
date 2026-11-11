"use client"

import { useMemo } from "react"
import { CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { GrowthDataPoint } from "@/features/dashboard/api"

const chartConfig = {
  views: {
    label: "Views",
    color: "#ea580c",
  },
  reach: {
    label: "Reach",
    color: "#9aa0ab",
  },
} satisfies ChartConfig

function formatAxisValue(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return `${value}`
}

function formatTooltipValue(value: number) {
  return value.toLocaleString()
}

/** Drop leading days with no views when later days have real counts (stale sync rows). */
function prepareChartData(data: GrowthDataPoint[]) {
  if (data.length === 0) return []
  const firstWithViews = data.findIndex((p) => p.views > 0)
  if (firstWithViews > 0) return data.slice(firstWithViews)
  return data
}

/** Round up to a clean axis max so 117 doesn't sit on the top edge. */
function computeYMax(points: GrowthDataPoint[]) {
  const peak = Math.max(...points.flatMap((d) => [d.views, d.reach]), 0)
  if (peak === 0) return 100
  const magnitude = 10 ** Math.floor(Math.log10(peak))
  return Math.ceil((peak * 1.2) / magnitude) * magnitude
}

interface GrowthChartProps {
  data: GrowthDataPoint[]
}

export function GrowthChart({ data }: GrowthChartProps) {
  const chartData = useMemo(() => prepareChartData(data), [data])
  const yMax = useMemo(() => computeYMax(chartData), [chartData])
  const showDots = chartData.length <= 14
  const showEndLabels = chartData.length <= 8
  const chartDataWithLabels = useMemo(
    () =>
      chartData.map((point, index) => ({
        ...point,
        reachLabel: index === chartData.length - 1 ? formatAxisValue(point.reach) : "",
        viewsLabel: index === chartData.length - 1 ? formatAxisValue(point.views) : "",
      })),
    [chartData]
  )

  if (chartData.length === 0) return null

  return (
    <ChartContainer
      config={chartConfig}
      className="h-full w-full aspect-auto select-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_svg]:outline-none [&_*:focus]:outline-none [&_*:focus-visible]:outline-none [&_*:focus-visible]:ring-0"
      onMouseDown={(e) => e.preventDefault()}
    >
      <LineChart
        data={chartDataWithLabels}
        margin={{ top: 16, right: showEndLabels ? 36 : 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          vertical={false}
          stroke="#eef0f2"
          strokeWidth={1}
        />

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={12}
          minTickGap={24}
          tick={{ fill: "#6b7180", fontSize: 11 }}
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={48}
          domain={[0, yMax]}
          allowDataOverflow={false}
          tick={{ fill: "#6b7180", fontSize: 11 }}
          tickFormatter={formatAxisValue}
        />

        <ChartTooltip
          cursor={{ stroke: "#d4d6dc", strokeWidth: 1, strokeDasharray: "4 4" }}
          content={
            <ChartTooltipContent
              className="border-border-subtle bg-white shadow-overlay"
              indicator="dot"
              labelFormatter={(label) => label}
              formatter={(value, name) => [
                formatTooltipValue(Number(value)),
                chartConfig[name as keyof typeof chartConfig]?.label ?? name,
              ]}
            />
          }
        />

        <Line
          dataKey="reach"
          type="monotone"
          stroke="var(--color-reach)"
          strokeWidth={1.5}
          dot={
            showDots
              ? { r: 3, fill: "#ffffff", stroke: "var(--color-reach)", strokeWidth: 2 }
              : false
          }
          activeDot={{
            r: 4,
            fill: "#ffffff",
            stroke: "var(--color-reach)",
            strokeWidth: 2,
          }}
          isAnimationActive={false}
        >
          {showEndLabels && (
            <LabelList
              dataKey="reachLabel"
              position="right"
              offset={8}
              className="fill-text-tertiary text-[10px] font-medium"
            />
          )}
        </Line>

        <Line
          dataKey="views"
          type="monotone"
          stroke="var(--color-views)"
          strokeWidth={2}
          dot={
            showDots
              ? { r: 3.5, fill: "#ffffff", stroke: "var(--color-views)", strokeWidth: 2 }
              : false
          }
          activeDot={{
            r: 5,
            fill: "#ea580c",
            stroke: "#ffffff",
            strokeWidth: 2,
          }}
          isAnimationActive={false}
        >
          {showEndLabels && (
            <LabelList
              dataKey="viewsLabel"
              position="right"
              offset={8}
              className="fill-[#c2410c] text-[10px] font-semibold"
            />
          )}
        </Line>
      </LineChart>
    </ChartContainer>
  )
}
