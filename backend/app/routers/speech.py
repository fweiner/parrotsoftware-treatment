"""Speech endpoints for text-to-speech using Amazon Polly."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from app.services.polly_service import polly_service

router = APIRouter()


class TTSRequest(BaseModel):
    """Text-to-speech request."""
    text: str
    gender: Optional[str] = "neutral"  # 'male', 'female', or 'neutral'


@router.post("/tts")
async def text_to_speech(request: TTSRequest) -> Response:
    """
    Convert text to speech using Amazon Polly.

    Returns MP3 audio content.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        # Get appropriate voice based on gender preference
        voice_id = polly_service.get_voice_for_gender(request.gender or "neutral")

        # Generate speech
        audio_content = await polly_service.synthesize_speech(
            text=request.text,
            voice_id=voice_id
        )

        return Response(
            content=audio_content,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline",
                "Cache-Control": "public, max-age=86400"  # Cache for 24 hours
            }
        )

    except Exception as e:
        print(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {str(e)}")
