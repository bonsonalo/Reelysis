"""Helpers for competitor engagement_rank storage (basis points: 354 = 3.54%)."""

# Engagement % is only comparable across accounts above this follower floor.
MIN_FOLLOWERS_FOR_ENGAGEMENT_DISPLAY = 10_000


def engagement_rate_to_rank(rate: float | int | None) -> int:
    """Convert Bright Data avg_engagement ratio to basis points (0.0455 → 455)."""
    if not rate:
        return 0
    return round(float(rate) * 10_000)


def engagement_rank_to_percent(rank: int) -> float:
    """Convert stored basis points to a display percentage."""
    return round(rank / 100, 2)


def engagement_rank_is_comparable(followers_count: int) -> bool:
    """Small accounts inflate interaction/follower % — hide from peer benchmarks."""
    return followers_count >= MIN_FOLLOWERS_FOR_ENGAGEMENT_DISPLAY
