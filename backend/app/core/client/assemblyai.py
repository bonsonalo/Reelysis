import time
import httpx
from app.core.config import settings
from app.core.logger import logger

ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com/v2"
POLL_INTERVAL_SECONDS = 3
DEFAULT_TIMEOUT_SECONDS = 300


class AssemblyAIClient:
    def transcribe_remote_url(self, audio_url: str, timeout: int = DEFAULT_TIMEOUT_SECONDS) -> dict:
        """
        Submit a remote audio/video URL to AssemblyAI and poll until complete.
        The application never downloads the media file.
        """
        if not settings.ASSEMBLYAI_API_KEY:
            raise ValueError("ASSEMBLYAI_API_KEY is not configured.")

        headers = {"authorization": settings.ASSEMBLYAI_API_KEY}
        with httpx.Client(timeout=30.0) as client:
            create_response = client.post(
                f"{ASSEMBLYAI_BASE_URL}/transcript",
                json={"audio_url": audio_url},
                headers=headers,
            )
            create_response.raise_for_status()
            transcript_id = create_response.json()["id"]

            deadline = time.time() + timeout
            while time.time() < deadline:
                poll_response = client.get(
                    f"{ASSEMBLYAI_BASE_URL}/transcript/{transcript_id}",
                    headers=headers,
                )
                poll_response.raise_for_status()
                data = poll_response.json()
                status = data.get("status")

                if status == "completed":
                    return {
                        "text": (data.get("text") or "").strip(),
                        "confidence": data.get("confidence"),
                    }
                if status == "error":
                    raise RuntimeError(data.get("error") or "AssemblyAI transcription failed.")

                time.sleep(POLL_INTERVAL_SECONDS)

        raise TimeoutError("AssemblyAI transcription timed out.")


assemblyai_client = AssemblyAIClient()
