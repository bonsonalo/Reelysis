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
    

    # The exchange_code_for_access_token method is responsible for exchanging the authorization code received from Instagram for a short-lived access token. It makes a POST request to the Instagram API's token endpoint, providing the necessary parameters such as client_id, client_secret, redirect_uri, code, and grant_type. 
    # If the request is successful, it returns the JSON response containing the access token and other related information.
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
    # The get_instagram_account method retrieves the Instagram account information associated with the provided access token. 
    # It makes a GET request to the Instagram Graph API's /me endpoint, including the access token as a query parameter.
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

    async def get_user_media(self, ig_user_id: str, access_token: str):
        """
        Fetches the recent media items (Reels/Videos) for the connected Instagram account.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://graph.instagram.com/{ig_user_id}/media",
                params={
                    "fields": "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp",
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            return response.json()

    async def get_media_insights(self, ig_media_id: str, access_token: str):
        """
        Fetches engagement metrics (reach, plays, saves, etc.) for a specific media item.
        """
        async with httpx.AsyncClient() as client:
            # Common metrics for Reels/Video in Instagram Graph API
            metrics = "reach,plays,saved,shares,total_interactions"
            response = await client.get(
                f"https://graph.instagram.com/{ig_media_id}/insights",
                params={
                    "metric": metrics,
                    "access_token": access_token
                }
            )
            # If insights aren't available (e.g. too new), return empty instead of crashing
            if response.status_code != 200:
                return {}
            return response.json()
        

meta_client= MetaClient()