"""Pydantic models for request/response schemas."""
from datetime import datetime, date
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field


# Auth Schemas
class UserSignup(BaseModel):
    """User signup request."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    """User login request."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response."""
    id: str
    email: str
    full_name: Optional[str] = None
    created_at: datetime


class TokenResponse(BaseModel):
    """Token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Profile Schemas
class ProfileUpdate(BaseModel):
    """Profile update request."""
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None


class ProfileResponse(BaseModel):
    """Profile response."""
    id: str
    email: str
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    created_at: datetime
    updated_at: datetime


# Treatment Session Schemas
class TreatmentSessionCreate(BaseModel):
    """Create treatment session request."""
    treatment_type: str
    data: Optional[Dict[str, Any]] = {}


class TreatmentSessionUpdate(BaseModel):
    """Update treatment session request."""
    completed_at: Optional[datetime] = None
    data: Optional[Dict[str, Any]] = None


class TreatmentSessionResponse(BaseModel):
    """Treatment session response."""
    id: str
    user_id: str
    treatment_type: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    data: Dict[str, Any]
    created_at: datetime


# Treatment Result Schemas
class TreatmentResultCreate(BaseModel):
    """Create treatment result request."""
    session_id: str
    score: Optional[int] = None
    details: Optional[Dict[str, Any]] = {}


class TreatmentResultResponse(BaseModel):
    """Treatment result response."""
    id: str
    session_id: str
    user_id: str
    score: Optional[int] = None
    details: Dict[str, Any]
    created_at: datetime


# User Progress Schemas
class UserProgressResponse(BaseModel):
    """User progress response."""
    id: str
    user_id: str
    treatment_type: str
    total_sessions: int
    average_score: Optional[float] = None
    last_session_at: Optional[datetime] = None
    updated_at: datetime


# Speech Schemas
class SpeechTranscribeResponse(BaseModel):
    """Speech transcription response."""
    text: str
    confidence: Optional[float] = None


class TextToSpeechRequest(BaseModel):
    """Text to speech request."""
    text: str
    language_code: str = "en-US"
    voice_name: Optional[str] = None


# Speech Echo Schemas
class SpeechEchoRequest(BaseModel):
    """Speech echo treatment request."""
    audio_data: str  # Base64 encoded audio


class SpeechEchoResponse(BaseModel):
    """Speech echo treatment response."""
    session_id: str
    transcribed_text: str
    audio_url: Optional[str] = None  # URL to synthesized audio
    created_at: datetime


# Word Finding Schemas
class WordFindingSessionCreate(BaseModel):
    """Create word-finding session request."""
    pass  # No parameters needed, stimuli selected randomly


class WordFindingResponse(BaseModel):
    """Word-finding response submission."""
    stimulus_id: int
    is_correct: bool
    cues_used: int = 0
    response_time: Optional[float] = None
    user_answer: Optional[str] = None
    correct_answer: str
