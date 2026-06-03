from google import genai
from app.core.config import settings
from app.core.logger import logger
from app.schema.ai_schema import VideoAnalysisResponse, StrategicReportResponse
import json

def get_genai_client():
    """Initializes and returns the Gemini API client."""
    if not settings.GEMINI_API_KEY:
        return None
    return genai.Client(api_key=settings.GEMINI_API_KEY)

async def detect_niche_service(biography: str, captions: list[str]):
    """
    Uses Gemini 1.5 Flash to detect the Instagram account's niche
    based on the biography and recent video captions.
    """
    if settings.AI_SIMULATION_MODE:
        logger.info("AI Simulation Mode: Mocking niche detection")
        return "Lifestyle & Productivity"

    if not settings.GEMINI_API_KEY:
        logger.warning("No Gemini API key provided. Falling back to default niche.")
        return "Uncategorized"

    try:
        client = get_genai_client()
        
        # Prepare the prompt
        captions_text = "\n- ".join(captions[:20]) # Use top 20 captions for context
        prompt = f"""
        Analyze the following Instagram account information and determine its specific niche.
        
        Biography:
        {biography}
        
        Recent Video Captions:
        - {captions_text}
        
        Return ONLY a short, descriptive name for the niche (e.g., "Fitness & Nutrition", "Tech Education", "Sustainable Fashion").
        """
        
        response = client.models.generate_content(
            model=settings.AI_MODEL_FLASH,
            contents=prompt
        )
        niche = response.text.strip()
        
        logger.info(f"AI Niche Detection Result: {niche}")
        return niche

    except Exception as e:
        logger.error(f"Error in Gemini niche detection: {e}")
        return "Lifestyle" # Fallback

async def analyze_video_service(caption: str, transcript: str, hashtags: list[str] = None):
    """
    Uses Gemini 1.5 Flash to analyze an individual video's creative and strategic elements.
    Returns a structured VideoAnalysisResponse object.
    """
    if settings.AI_SIMULATION_MODE:
        logger.info("AI Simulation Mode: Mocking video analysis")
        return VideoAnalysisResponse(
            topic="Mock Topic",
            category="Educational",
            content_pillar="How-to",
            hook="This is a mock hook",
            hook_score=8,
            pacing="Fast",
            visual_style="Bright and energetic",
            strengths=["Clear audio", "Good lighting"],
            weaknesses=["Text is too small"],
            confidence=90
        )

    if not settings.GEMINI_API_KEY:
        logger.warning("No Gemini API key provided. Cannot analyze video.")
        return None

    try:
        client = get_genai_client()
        
        hashtags_text = ", ".join(hashtags) if hashtags else "None"
        
        prompt = f"""
        Analyze the following Instagram video content and provide a strategic creative assessment.
        
        Caption:
        {caption}
        
        Transcript:
        {transcript}
        
        Hashtags:
        {hashtags_text}
        
        Evaluate the hook, pacing, category, and strategic value.
        """
        
        response = client.models.generate_content(
            model=settings.AI_MODEL_FLASH,
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': VideoAnalysisResponse,
            }
        )
        
        analysis = response.parsed
        logger.info(f"AI Video Analysis successful for topic: {analysis.topic}")
        return analysis

    except Exception as e:
        logger.error(f"Error in Gemini video analysis: {e}")
        return None

async def generate_strategic_report_service(user_data: dict, competitor_data: list):
    """
    Acting as a Senior Social Media Strategist, this function compares the user's content 
    against competitors and generates a comprehensive growth roadmap.
    """
    if settings.AI_SIMULATION_MODE:
        logger.info("AI Simulation Mode: Mocking strategic report")
        return StrategicReportResponse(
            summary="This is a mock strategy report summary.",
            market_trends=["Trend 1", "Trend 2"],
            competitor_strengths=["Strength A"],
            user_gaps=["Gap X"],
            user_advantages=["Advantage Y"],
            roadmap=[],
            report_markdown="# Mock Strategy Report\nYour growth roadmap is here..."
        )

    if not settings.GEMINI_API_KEY:
        return None

    try:
        client = get_genai_client()
        
        prompt = f"""
        You are a world-class Instagram Growth Strategist. Analyze the following data for an account and its competitors.
        
        USER DATA:
        {json.dumps(user_data, indent=2)}
        
        COMPETITOR DATA:
        {json.dumps(competitor_data, indent=2)}
        
        TASK:
        1. Identify the core market trends based on competitor success.
        2. Highlight the user's specific content gaps and competitive advantages.
        3. Provide a clear, 30-day roadmap with 3-5 prioritized recommendations.
        4. Generate a detailed report in Markdown format for the user to read.
        """
        
        response = client.models.generate_content(
            model=settings.AI_MODEL_PRO, # Using Pro for the final strategic report
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': StrategicReportResponse,
            }
        )
        
        report = response.parsed
        logger.info("AI Strategic Report generated successfully.")
        return report

    except Exception as e:
        logger.error(f"Error in Gemini strategic report generation: {e}")
        return None
