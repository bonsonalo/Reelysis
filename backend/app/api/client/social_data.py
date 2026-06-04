import httpx
from app.core.config import settings
from app.core.logger import logger

class SocialDataClient:
    def __init__(self):
        self.api_key = settings.BRIGHT_DATA_API_KEY
        self.base_url = "https://api.brightdata.com/datasets/v3"
        # Verified Template ID for Instagram Hashtag & Profile Discovery
        self.discovery_dataset_id = "gd_l1villgoiiidt09ci" 
        # Verified Template ID for Instagram Profile Posts/Reels
        self.posts_dataset_id = "gd_l1viktl72bvl7bjuj0"

    async def search_creators_by_niche(self, niche: str):
        """
        PHASE 1: THE TRIGGER (Discovery)
        Sends the niche to Bright Data to find top creators via hashtag search.
        Returns the 'Tracking Number' (snapshot_id).
        """
        if settings.AI_SIMULATION_MODE or not self.api_key:
            logger.info(f"Simulation Mode: Mocking creator search for niche: {niche}")
            return "mock_snapshot_id_123"

        url = f"{self.base_url}/trigger?dataset_id={self.discovery_dataset_id}&format=json"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        clean_niche = niche.replace(" ", "").lower()
        payload = [{"hashtag": clean_niche}]

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                snapshot_id = data.get("snapshot_id")
                logger.info(f"Bright Data discovery search triggered. Tracking ID: {snapshot_id}")
                return snapshot_id
            except Exception as e:
                logger.error(f"Error hiring investigator (Bright Data Discovery): {e}")
                return None

    async def get_creator_media(self, handle: str):
        """
        NEW: Fetches recent reels/posts for a specific competitor profile.
        Returns a snapshot_id for polling.
        """
        if settings.AI_SIMULATION_MODE or not self.api_key:
            logger.info(f"Simulation Mode: Mocking media fetch for handle: {handle}")
            return f"mock_media_snapshot_{handle}"

        url = f"{self.base_url}/trigger?dataset_id={self.posts_dataset_id}&format=json"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        # Bright Data expects the full profile URL for this dataset
        payload = [{"url": f"https://www.instagram.com/{handle}/"}]

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                snapshot_id = response.json().get("snapshot_id")
                logger.info(f"Bright Data media fetch triggered for {handle}. Snapshot ID: {snapshot_id}")
                return snapshot_id
            except Exception as e:
                logger.error(f"Error triggering Bright Data media fetch for {handle}: {e}")
                return None

    async def get_snapshot_results(self, snapshot_id: str):
        """
        PHASE 3: THE PICKUP
        Checks if a search (discovery or media) is finished and returns the structured data.
        """
        # Simulation Fallback for Discovery Results
        if snapshot_id == "mock_snapshot_id_123":
            return [
                {"handle": "fitness_expert_pro", "display_name": "Fitness Pro", "followers_count": 150000, "engagement_rate": 0.045},
                {"handle": "gym_daily_tips", "display_name": "Gym Daily", "followers_count": 85000, "engagement_rate": 0.062},
                {"handle": "wellness_coach_anna", "display_name": "Anna Wellness", "followers_count": 42000, "engagement_rate": 0.081}
            ]
        
        # Simulation Fallback for Media Results
        if snapshot_id.startswith("mock_media_snapshot_"):
            handle = snapshot_id.replace("mock_media_snapshot_", "")
            return [
                {
                    "id": f"vid_{handle}_1",
                    "caption": f"Secrets of {handle} revealed! #growth",
                    "media_type": "VIDEO",
                    "permalink": "https://www.instagram.com/reels/mock/",
                    "thumbnail_url": "https://placehold.co/400",
                    "view_count": 10000,
                    "like_count": 500,
                    "comment_count": 20
                },
                {
                    "id": f"vid_{handle}_2",
                    "caption": f"Top tips from {handle} #lifestyle",
                    "media_type": "VIDEO",
                    "permalink": "https://www.instagram.com/reels/mock2/",
                    "thumbnail_url": "https://placehold.co/400",
                    "view_count": 120000,
                    "like_count": 8000,
                    "comment_count": 120
                }
            ]

        url = f"{self.base_url}/snapshot/{snapshot_id}?format=json"
        headers = {"Authorization": f"Bearer {self.api_key}"}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                
                # 202 status means it is still processing
                if response.status_code == 202:
                    return None
                
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Error picking up results for snapshot {snapshot_id}: {e}")
                return None

social_data_client = SocialDataClient()
