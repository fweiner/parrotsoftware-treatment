"""Treatment endpoints for treatment sessions and speech processing."""
import base64
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Optional
from app.core.dependencies import CurrentUserId, Database
from app.models.schemas import (
    TreatmentSessionCreate,
    TreatmentSessionResponse,
    TreatmentSessionUpdate,
    SpeechTranscribeResponse,
    TextToSpeechRequest
)
from app.services.treatment_service import TreatmentService
from app.services.speech_service import speech_service


router = APIRouter()


@router.post("/sessions", response_model=dict)
async def create_treatment_session(
    session_data: TreatmentSessionCreate,
    user_id: CurrentUserId,
    db: Database
):
    """Create a new treatment session."""
    service = TreatmentService(db)
    result = await service.create_session(user_id, session_data)
    return result


@router.get("/sessions", response_model=List[dict])
async def get_user_sessions(
    user_id: CurrentUserId,
    db: Database,
    treatment_type: Optional[str] = None,
    limit: int = 50
):
    """Get all sessions for the current user."""
    service = TreatmentService(db)
    results = await service.get_user_sessions(
        user_id,
        treatment_type=treatment_type,
        limit=limit
    )
    return results


@router.get("/sessions/{session_id}", response_model=dict)
async def get_session(
    session_id: str,
    user_id: CurrentUserId,
    db: Database
):
    """Get a specific session."""
    service = TreatmentService(db)
    result = await service.get_session(session_id, user_id)

    if not result:
        raise HTTPException(status_code=404, detail="Session not found")

    return result


@router.patch("/sessions/{session_id}", response_model=dict)
async def update_session(
    session_id: str,
    update_data: TreatmentSessionUpdate,
    user_id: CurrentUserId,
    db: Database
):
    """Update a treatment session."""
    service = TreatmentService(db)
    result = await service.complete_session(
        session_id,
        user_id,
        data=update_data.data
    )
    return result


@router.post("/speech/transcribe", response_model=SpeechTranscribeResponse)
async def transcribe_speech(
    audio: UploadFile = File(...),
    user_id: CurrentUserId = None
):
    """Transcribe speech audio to text."""
    try:
        # Read audio content
        audio_content = await audio.read()

        # Transcribe
        text, confidence = await speech_service.speech_to_text(audio_content)

        return SpeechTranscribeResponse(
            text=text,
            confidence=confidence
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error transcribing audio: {str(e)}"
        )


@router.post("/speech/synthesize")
async def synthesize_speech(
    request: TextToSpeechRequest,
    user_id: CurrentUserId = None
):
    """Convert text to speech audio."""
    try:
        # Generate speech
        audio_content = await speech_service.text_to_speech(
            request.text,
            language_code=request.language_code,
            voice_name=request.voice_name
        )

        # Return as base64 for easy JSON transport
        audio_base64 = base64.b64encode(audio_content).decode('utf-8')

        return {
            "audio_content": audio_base64,
            "format": "mp3"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error synthesizing speech: {str(e)}"
        )
