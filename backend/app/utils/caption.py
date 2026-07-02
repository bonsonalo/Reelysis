import re
from collections import Counter

_HASHTAG_PATTERN = re.compile(r"#(\w+)", re.UNICODE)


def parse_hashtags_from_caption(caption: str) -> list[str]:
    """Extract hashtag names (without #) from a caption."""
    if not caption:
        return []
    return [match.group(1) for match in _HASHTAG_PATTERN.finditer(caption)]


def top_frequent_hashtags(captions: list[str], limit: int = 20) -> list[str]:
    """Return the most frequently used hashtags across captions."""
    counter: Counter[str] = Counter()
    for caption in captions:
        for tag in parse_hashtags_from_caption(caption):
            counter[tag.lower()] += 1
    return [tag for tag, _ in counter.most_common(limit)]
