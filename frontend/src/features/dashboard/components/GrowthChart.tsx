"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { GrowthDataPoint } from "@/features/dashboard/api"

const chartConfig = {
  views: {
    label: "Views",
    color: "hsl(var(--primary))",
  },
  reach: {
    label: "Reach",
    color: "hsl(var(--emerald-500))",
  },
} satisfies ChartConfig

interface GrowthChartProps {
  data: GrowthDataPoint[]
}

export function GrowthChart({ data }: GrowthChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{
          left: 0,
          right: 0,
          top: 10,
          bottom: 0
        }}
      >
        <defs>
          <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-views)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-views)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillReach" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-reach)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-reach)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
        />
        <YAxis hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Area
          dataKey="reach"
          type="natural"
          fill="url(#fillReach)"
          stroke="var(--color-reach)"
          strokeWidth={2}
          stackId="a"
        />
        <Area
          dataKey="views"
          type="natural"
          fill="url(#fillViews)"
          stroke="var(--color-views)"
          strokeWidth={2}
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  )
}
