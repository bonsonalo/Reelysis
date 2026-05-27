from app.core.config import settings
import secrets
import httpx

class MetaClient:
    def __init__(self):
        self.app_id= settings.META_APP_ID
        self.app_secret= settings.META_APP_SECRET
        self.redirect_uri= settings.META_REDIRECT_URI
        self.graph_api_version= settings.META_GRAPH_API_VERSION

    def get_oauth_url(self):
        state = secrets.token_urlsafe(32)
        return {"url": f"https://www.instagram.com/oauth/authorize?client_id={self.app_id}&redirect_uri={self.redirect_uri}&scope=instagram_business_basic,instagram_business_manage_insights&response_type=code&state={state}", "state": state}
    
    async def exchange_code_for_access_token(self, code: str):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.instagram.com/oauth/access_token",
                data={
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "redirect_uri": self.redirect_uri,
                    "code": code,
                    "grant_type": "authorization_code",
                },
            )
            response.raise_for_status()
            return response.json()
    async def exchange_for_long_lived_token(self, short_lived_token: str):
        async with httpx.AsyncClient() as client:
            # The endpoint for exchanging a short-lived token for a long-lived token is different from the one used to exchange the code for a short-lived token.
            # we provide the short-lived token as a query parameter and include the client secret in the request to ensure that only authorized applications can exchange tokens. 
            # it also includes access_tokentype=ig_exchange_token to specify the type of token exchange we are performing. 
            # and also grant_type=ig_exchange_token to indicate that we are exchanging a short-lived token for a long-lived token.
            response = await client.get(
                "https://graph.instagram.com/access_token",
                params={
                    "grant_type": "ig_exchange_token",
                    "client_secret": self.app_secret,
                    "access_token": short_lived_token
                }
            )
            response.raise_for_status()
            return response.json()
    async def get_instagram_account(self, access_token: str):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://graph.instagram.com/me",
                params= {
                    "fields" : "id,username,account_type,profile_picture_url,biography,followers_count,media_count",
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            return response.json()
        

meta_client= MetaClient()