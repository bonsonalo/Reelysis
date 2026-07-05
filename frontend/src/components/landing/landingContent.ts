/**
 * Marketing shell — matches common SaaS marketing gutters:
 * - max width ~1080px (Linear, Vercel marketing)
 * - 16px side padding on mobile, 24px from sm+ (Stripe, Apple product pages)
 */
export const landingShellClass =
  'mx-auto w-full max-w-[1080px] px-4 sm:px-6'

export const insightCards = [
  {
    label: 'Reels',
    title: 'Per Reel',
    description:
      'Hook score, engagement, transcript, and topic on every synced Reel, not just a views count.',
  },
  {
    label: 'Market',
    title: 'Per niche',
    description:
      'Competitor engagement and content patterns from the accounts you choose to track.',
  },
  {
    label: 'Strategy',
    title: 'Per report',
    description:
      'A full write-up with evidence and action items you can work through over time.',
  },
]

export const steps = [
  {
    step: '1',
    title: 'Connect Instagram',
    description:
      'Link your account securely. Reelysis imports your public Reels and profile data. No manual uploads.',
  },
  {
    step: '2',
    title: 'Sync and analyze',
    description:
      'We transcribe your Reels, score each opening hook, group content into pillars, and refresh competitor benchmarks in your niche.',
  },
  {
    step: '3',
    title: 'Act on your report',
    description:
      'Get a written strategy with prioritized recommendations. Mark items done as you ship new content.',
  },
]

export const capabilities = [
  {
    tag: 'Dashboard',
    title: 'Performance overview',
    description:
      'Views, reach, engagement, and hook scores in one place, updated each time you sync.',
  },
  {
    tag: 'Reels',
    title: 'Hook scores',
    description:
      'Every Reel rated 0–100 on how strong the opening is. See which intros actually stop the scroll.',
  },
  {
    tag: 'Themes',
    title: 'Content pillars',
    description:
      'Themes ranked by the engagement they drive, so you know what topics to double down on.',
  },
  {
    tag: 'Competitors',
    title: 'Benchmark tracking',
    description:
      'Follow up to 10 accounts in your niche. Compare their engagement to yours on the same metrics.',
  },
  {
    tag: 'Reports',
    title: 'Strategy write-ups',
    description:
      'AI compares your Reels to the market and writes a full report with gaps, opportunities, and next moves.',
  },
  {
    tag: 'Roadmap',
    title: 'Action items',
    description:
      'Recommendations you can check off: content ideas, hook improvements, and pillar shifts backed by evidence.',
  },
]

export const dashboardMetrics = [
  {
    label: 'Growth',
    metric: 'Views',
    title: 'Total reach over time',
    description:
      'Cumulative plays across synced Reels, tracked at each sync so you can spot momentum, not just a single snapshot.',
  },
  {
    label: 'Engagement',
    metric: '4.2%',
    title: 'Interaction rate',
    description:
      'Likes and comments relative to views, averaged across your library. See whether people watch or actually respond.',
  },
  {
    label: 'Hooks',
    metric: '87/100',
    title: 'Top hook score',
    description:
      'Your best opening rated out of 100. Compare Reels to find which intros consistently stop the scroll.',
  },
  {
    label: 'Themes',
    metric: 'Pillars',
    title: 'Content themes',
    description:
      'Topics grouped and ranked by engagement so you know which themes to repeat and which to retire.',
  },
]

export const syncAnalysis = [
  {
    title: 'Reel import',
    description: 'Pulls your recent Reels, captions, and public metrics from Instagram.',
    bullets: ['Thumbnail and caption for every Reel', 'Views, reach, likes, and comments', 'Posted date and media metadata'],
  },
  {
    title: 'Transcription',
    description: 'Audio is transcribed when available so analysis goes beyond the caption alone.',
    bullets: ['Spoken hook and script structure', 'Higher confidence scores with transcript', 'Caption-only fallback when needed'],
  },
  {
    title: 'AI scoring',
    description: 'Each Reel is scored and categorized for hooks, topics, and engagement patterns.',
    bullets: ['Hook score 0–100 per Reel', 'Content pillar assignment', 'Topic and format tagging'],
  },
  {
    title: 'Competitor refresh',
    description: 'Tracked accounts are updated before reports so benchmarks reflect current market data.',
    bullets: ['Follower and Reel counts', 'Engagement benchmarks by niche', 'Used in strategy report generation'],
  },
]

export const reportIncludes = [
  {
    label: 'Overview',
    title: 'Executive summary',
    description: 'A plain-language overview of how your content is performing right now.',
    bullets: ['What is working in your library', 'Where engagement is slipping', 'Top opportunities this month'],
  },
  {
    label: 'Market',
    title: 'Competitive context',
    description: 'How your Reels compare to the accounts you track in the same niche.',
    bullets: ['Engagement gaps vs. competitors', 'Themes they post that you do not', 'Formats worth testing'],
  },
  {
    label: 'Actions',
    title: 'Prioritized recommendations',
    description: 'Specific next steps you can mark done as you publish new content.',
    bullets: ['Hook improvements with evidence', 'Pillar shifts to test next', 'Content ideas backed by data'],
  },
]

export const competitorBenefits = [
  {
    label: 'Tracking',
    title: 'Up to 10 accounts',
    description:
      'Add handles manually or discover suggestions in your niche. Each profile stays synced for benchmarking.',
  },
  {
    label: 'Benchmarks',
    title: 'Engagement comparison',
    description:
      'See average engagement for accounts with 10k+ followers, so you compare to similar-sized peers.',
  },
  {
    label: 'Reports',
    title: 'Market-backed strategy',
    description:
      'Competitor Reels feed directly into strategy reports so recommendations reference real examples.',
  },
]

export const audiences = [
  {
    title: 'Creators',
    description:
      'Posting Reels weekly and want clarity on what to film next, not another views screenshot.',
  },
  {
    title: 'Coaches & educators',
    description:
      'Teaching on Instagram and need to know which formats and hooks retain your audience.',
  },
  {
    title: 'Brands on Reels',
    description:
      'Running short-form content and benchmarking against competitors in the same category.',
  },
]

export const faqs = [
  {
    question: 'What does Reelysis actually analyze?',
    answer:
      'Your synced Reels: captions, transcripts when available, views, reach, engagement, hook strength, and content themes. Reports also pull in competitor Reels you track.',
  },
  {
    question: 'How long does the first sync take?',
    answer:
      'Usually a few minutes depending on how many Reels you have. Report generation can take longer the first time while competitor data is refreshed.',
  },
  {
    question: 'Do I need to add competitors?',
    answer:
      'Not required to use the dashboard, but reports work best with competitors added. You can auto-discover accounts in your niche or add handles manually.',
  },
  {
    question: 'What is a hook score?',
    answer:
      'A 0–100 rating of how strong your opening is (the first few seconds or first line) at grabbing attention. 80+ is strong; below 50 means the opener needs work.',
  },
  {
    question: 'Is my Instagram data private?',
    answer:
      'Your data is tied to your account and used only to run analysis and reports for you. We do not sell your content or metrics.',
  },
  {
    question: 'Can I use Reelysis without generating a report?',
    answer:
      'Yes. The dashboard, Reel library, hook scores, content pillars, and competitor tracking all work after a sync. Reports are optional when you want a full written strategy.',
  },
  {
    question: 'How often should I sync?',
    answer:
      'Run a sync after you publish new Reels or when you want fresh metrics. Each sync updates your dashboard and growth charts with the latest Instagram data.',
  },
  {
    question: 'What niche do competitors need to match?',
    answer:
      'During onboarding, Reelysis detects your content niche from synced captions. Competitor discovery uses that context. You can also add any public handle manually.',
  },
]
