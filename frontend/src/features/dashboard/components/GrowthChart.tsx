"use client"

import { CartesianGrid, XAxis, YAxis, Line, LineChart, ResponsiveContainer } from "recharts"
import { GrowthDataPoint } from "@/features/dashboard/api"

interface GrowthChartProps {
  data: GrowthDataPoint[]
}

export function GrowthChart({ data }: GrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          left: 10,
          right: 10,
          top: 10,
          bottom: 10
        }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tick={{ fill: '#888', fontSize: 12 }}
        />
        <YAxis 
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fill: '#888', fontSize: 12 }}
        />
        <Line
          dataKey="reach"
          type="monotone"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="views"
          type="monotone"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
