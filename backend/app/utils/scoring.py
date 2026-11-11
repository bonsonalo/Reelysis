"""Normalize AI scores to a consistent 0-100 display scale."""


def normalize_score_0_100(score: int | float | None) -> int:
    """
    Gemini sometimes returns 1-10 before prompt rubric; legacy rows used that scale.
    Values <= 10 are treated as decades and multiplied by 10.
    """
    if score is None:
        return 0
    value = int(round(float(score)))
    if value <= 0:
        return 0
    if value <= 10:
        return min(value * 10, 100)
    return min(max(value, 0), 100)
