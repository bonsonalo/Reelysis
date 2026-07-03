/** engagement_rank is stored as basis points (354 = 3.54%). */

/** Match backend MIN_FOLLOWERS_FOR_ENGAGEMENT_DISPLAY — % isn't comparable below this. */
export const MIN_FOLLOWERS_FOR_ENGAGEMENT_DISPLAY = 10_000

export function formatCompetitorEngagement(rank: number): string {
  if (!rank) return '—'
  const percent = rank / 100
  if (percent < 0.1) return percent.toFixed(2)
  if (percent < 10) return percent.toFixed(1)
  return percent.toFixed(0)
}

/** Bar fill: 5% engagement = full width. */
export function competitorEngagementBarWidth(rank: number): number {
  if (!rank) return 0
  return Math.min(100, (rank / 500) * 100)
}

export function shouldShowCompetitorEngagement(
  followersCount: number,
  engagementRank: number,
): boolean {
  return followersCount >= MIN_FOLLOWERS_FOR_ENGAGEMENT_DISPLAY && engagementRank > 0
}
