from app.core.config import settings
from app.core.logger import logger
import secrets
import httpx
from urllib.parse import quote

class MetaClient:
    def __init__(self):
        self.app_id = settings.IG_APP_ID
        self.app_secret = settings.IG_APP_SECRET
        self.redirect_uri = settings.IG_REDIRECT_URI

    def get_oauth_url(self):
        print("AUTHORIZE using redirect_uri:", repr(self.redirect_uri))
        state = secrets.token_urlsafe(32)

        scopes = [
            'instagram_business_basic',
            'instagram_business_manage_insights',
        ]
        scope_param = ','.join(scopes)
        
        url = (
            f'https://www.instagram.com/oauth/authorize?'
            f'client_id={self.app_id.strip()}&'
            f'redirect_uri={self.redirect_uri}&'
            f'state={state}&'
            f'response_type=code&'
            f'scope={scope_param}'
        )
        return {'url': url, 'state': state}

    async def exchange_code_for_access_token(self, code: str):
        print("RECEIVED CODE:", repr(code))
        print("EXCHANGE using redirect_uri:", repr(self.redirect_uri))
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://api.instagram.com/oauth/access_token',
                data={
                    'client_id': self.app_id.strip(),
                    'client_secret': self.app_secret.strip(),
                    'grant_type': 'authorization_code',
                    'redirect_uri': self.redirect_uri,
                    'code': code,
                },
            )
            print("STATUS:", response.status_code)
            print("BODY:", response.text)
            response.raise_for_status()
            return response.json()

    async def exchange_for_long_lived_token(self, short_lived_token: str):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f'https://graph.instagram.com/access_token',
                params={
                    'grant_type': 'ig_exchange_token',
                    'client_id': self.app_id.strip(),
                    'client_secret': self.app_secret.strip(),
                    'access_token': short_lived_token
                }
            )
            response.raise_for_status()
            return response.json()

    async def get_instagram_account(self, access_token: str):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://graph.instagram.com/me',
                params={
                    'fields': 'id,username,account_type,name,profile_picture_url,followers_count,media_count,biography',
                    'access_token': access_token
                }
            )
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

    async def get_user_media(self, ig_user_id: str, access_token: str):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://graph.instagram.com/me/media',
                params={
                    'fields': 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp',
                    'access_token': access_token
                }
            )
            response.raise_for_status()
            return response.json()

    async def get_media_insights(self, ig_media_id: str, access_token: str):
        async with httpx.AsyncClient() as client:
            metrics = 'reach,plays,saved,shares,total_interactions'
            response = await client.get(
                f'https://graph.instagram.com/{ig_media_id}/insights',
                params={
                    'metric': metrics,
                    'access_token': access_token
                }
            )
            if response.status_code != 200:
                logger.warning(f"Failed to fetch insights for media {ig_media_id}: {response.text}")
                return {}
            return response.json()

meta_client = MetaClient()
