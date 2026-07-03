import type { ReactNode } from 'react'

export type MetricHelpContent = {
  title: string
  body: ReactNode
}

function Tip({ what, aim }: { what: string; aim: string }) {
  return (
    <>
      <span className="block">{what}</span>
      <span className="mt-1.5 block text-zinc-400">{aim}</span>
    </>
  )
}

export const METRIC_HELP = {
  totalViews: {
    title: 'Total Views',
    body: <Tip what="How many times your Reels were played." aim="Going up each sync is a good sign." />,
  },
  averageReach: {
    title: 'Average Reach',
    body: (
      <Tip
        what="How many unique people saw each Reel, on average."
        aim="Higher reach = more eyes on your content."
      />
    ),
  },
  avgEngagement: {
    title: 'Avg. Engagement',
    body: (
      <Tip
        what="How often people interact (like, comment, save) vs. who saw it."
        aim="3%+ is solid · 6%+ is great"
      />
    ),
  },
  topHookScore: {
    title: 'Top Hook Score',
    body: (
      <Tip
        what="Your best opening hook, rated 0–100. Does it stop the scroll?"
        aim="80+ strong · 50–79 okay · below 50, sharpen the opener"
      />
    ),
  },
  aiConfidence: {
    title: 'AI Confidence',
    body: (
      <Tip
        what="How sure the AI is about this analysis."
        aim="70%+ with a transcript · lower = mostly caption-only"
      />
    ),
  },
  hookScore: {
    title: 'Hook Score',
    body: (
      <Tip
        what="How strong your opening is at grabbing attention (0–100)."
        aim="80+ strong · 50–79 okay · below 50, work on the first 3 seconds"
      />
    ),
  },
  videoViews: {
    title: 'Total Views',
    body: <Tip what="Play count for this Reel." aim="Compare it to your other Reels." />,
  },
  videoEngagement: {
    title: 'Engagement',
    body: (
      <Tip
        what="Likes + comments ÷ views for this Reel."
        aim="2–5% is solid · 8%+ is excellent"
      />
    ),
  },
  contentPillar: {
    title: 'Content Pillar',
    body: (
      <Tip
        what="The main theme — tutorial, story, tips, etc."
        aim="Post more of what performs best for you."
      />
    ),
  },
  pacing: {
    title: 'Pacing',
    body: (
      <Tip
        what="How fast your Reel moves — cuts, energy, flow."
        aim="Fast usually wins on Reels, but match your message."
      />
    ),
  },
  pillarEngagement: {
    title: 'Pillar Engagement',
    body: (
      <Tip
        what="Avg. interaction rate for Reels in this theme."
        aim="3%+ means this pillar is resonating."
      />
    ),
  },
} satisfies Record<string, MetricHelpContent>
