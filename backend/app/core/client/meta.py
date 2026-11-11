from app.core.config import settings
from app.core.logger import logger
import secrets
import httpx
from urllib.parse import urlencode

META_HTTP_TIMEOUT = 30.0
MEDIA_PAGE_SIZE = 25


class InstagramAuthError(Exception):
    """The stored Instagram token is expired or revoked — the user must reconnect."""


def _raise_for_auth_error(response: httpx.Response) -> None:
    """Code 190 = expired/revoked token (102 = legacy session error). Other OAuthException codes are not auth."""
    if response.status_code not in (400, 401, 403):
        return
    try:
        error = response.json().get("error", {})
    except ValueError:
        return
    if error.get("code") in (190, 102):
        raise InstagramAuthError(
            "Instagram access expired. Please reconnect your Instagram account."
        )


class MetaClient:
    def __init__(self):
        self.app_id = settings.IG_APP_ID
        self.app_secret = settings.IG_APP_SECRET
        self.redirect_uri = settings.IG_REDIRECT_URI

    def _http_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=META_HTTP_TIMEOUT)

    def get_oauth_url(self):
        state = secrets.token_urlsafe(32)

        scopes = [
            'instagram_business_basic',
            'instagram_business_manage_insights',
        ]
        query = urlencode({
            'client_id': self.app_id.strip(),
            'redirect_uri': self.redirect_uri,
            'state': state,
            'response_type': 'code',
            'scope': ','.join(scopes),
        })
        return {'url': f'{settings.IG_OAUTH_AUTHORIZE_URL}?{query}', 'state': state}

    async def exchange_code_for_access_token(self, code: str):
        async with self._http_client() as client:
            response = await client.post(
                settings.IG_OAUTH_TOKEN_URL,
                data={
                    'client_id': self.app_id.strip(),
                    'client_secret': self.app_secret.strip(),
                    'grant_type': 'authorization_code',
                    'redirect_uri': self.redirect_uri,
                    'code': code,
                },
            )
            if response.status_code >= 400:
                # The body never contains a token on failure, but log only the status to be safe.
                logger.error("Instagram code exchange failed with status %s", response.status_code)
            response.raise_for_status()
            return response.json()

    async def exchange_for_long_lived_token(self, short_lived_token: str):
        async with self._http_client() as client:
            response = await client.get(
                f'{settings.IG_GRAPH_BASE_URL}/access_token',
                params={
                    'grant_type': 'ig_exchange_token',
                    'client_id': self.app_id.strip(),
                    'client_secret': self.app_secret.strip(),
                    'access_token': short_lived_token
                }
            )
            response.raise_for_status()
            return response.json()

    async def refresh_long_lived_token(self, long_lived_token: str):
        """Extend a long-lived token by another ~60 days (token must be ≥24h old and not expired)."""
        async with self._http_client() as client:
            response = await client.get(
                f'{settings.IG_GRAPH_BASE_URL}/refresh_access_token',
                params={
                    'grant_type': 'ig_refresh_token',
                    'access_token': long_lived_token,
                },
            )
            _raise_for_auth_error(response)
            response.raise_for_status()
            return response.json()

    async def get_instagram_account(self, access_token: str):
        async with self._http_client() as client:
            response = await client.get(
                f'{settings.IG_GRAPH_BASE_URL}/me',
                params={
                    'fields': 'id,username,account_type,name,profile_picture_url,followers_count,media_count,biography',
                    'access_token': access_token
                }
            )
            _raise_for_auth_error(response)
            response.raise_for_status()
            details = response.json()
            return {
                'id': details['id'],
                'username': details['username'],
                'account_type': details.get('account_type', 'BUSINESS'),
                'profile_picture_url': details.get('profile_picture_url'),
                'biography': details.get('biography'),
                'followers_count': details.get('followers_count', 0),
                'media_count': details.get('media_count', 0)
            }

    async def get_user_media(self, ig_user_id: str, access_token: str, max_items: int = 50):
        """Follow paging.next until max_items items are collected (newest first)."""
        items: list[dict] = []
        url = f'{settings.IG_GRAPH_BASE_URL}/me/media'
        params: dict | None = {
            'fields': 'id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp',
            'limit': MEDIA_PAGE_SIZE,
            'access_token': access_token,
        }
        async with self._http_client() as client:
            while url and len(items) < max_items:
                response = await client.get(url, params=params)
                _raise_for_auth_error(response)
                response.raise_for_status()
                payload = response.json()
                items.extend(payload.get('data', []))
                # paging.next already contains every query param, including the token.
                url = (payload.get('paging') or {}).get('next')
                params = None
        return {'data': items[:max_items]}

    async def get_media_insights(self, ig_media_id: str, access_token: str):
        async with self._http_client() as client:
            metrics = 'reach,views,likes,comments,saved,shares,total_interactions'
            response = await client.get(
                f'{settings.IG_GRAPH_BASE_URL}/{ig_media_id}/insights',
                params={
                    'metric': metrics,
                    'period': 'lifetime',
                    'access_token': access_token,
                }
            )
            _raise_for_auth_error(response)
            if response.status_code != 200:
                logger.warning(
                    "Failed to fetch insights for media %s (%s): %s",
                    ig_media_id,
                    response.status_code,
                    response.text[:500],
                )
                return {}
            payload = response.json()
            if not payload.get("data"):
                logger.warning("Insights returned empty data for media %s", ig_media_id)
            return payload

meta_client = MetaClient()
