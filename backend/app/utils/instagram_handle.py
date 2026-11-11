import re

INSTAGRAM_HANDLE_RE = re.compile(r"^[a-z0-9._]{1,30}$")


def normalize_handle(handle: str) -> str:
    """Accept '@name', 'name' or a profile URL; Instagram handles are case-insensitive."""
    cleaned = handle.strip()
    cleaned = re.sub(r"^(https?://)?(www\.)?instagram\.com/", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.split("?")[0].strip("/").lstrip("@").lower()
    if not cleaned:
        raise ValueError("Instagram handle is required.")
    if not INSTAGRAM_HANDLE_RE.match(cleaned):
        raise ValueError(
            "Enter a valid Instagram handle (letters, numbers, periods and underscores, up to 30 characters)."
        )
    return cleaned
