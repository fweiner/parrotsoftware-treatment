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
    # Personal information fields
    gender: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    hair_color: Optional[str] = None
    eye_color: Optional[str] = None
    job: Optional[str] = None
    phone_number: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    marital_status: Optional[str] = None
    number_of_children: Optional[int] = None
    favorite_food: Optional[str] = None
    favorite_music: Optional[str] = None


class ProfileResponse(BaseModel):
    """Profile response."""
    id: str
    email: str
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    # Personal information fields
    gender: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    hair_color: Optional[str] = None
    eye_color: Optional[str] = None
    job: Optional[str] = None
    phone_number: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    marital_status: Optional[str] = None
    number_of_children: Optional[int] = None
    favorite_food: Optional[str] = None
    favorite_music: Optional[str] = None
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


# Life Words (Find My Life Words) Schemas
class PersonalContactCreate(BaseModel):
    """Create personal contact request."""
    name: str
    nickname: Optional[str] = None
    relationship: str
    photo_url: str
    category: Optional[str] = None
    description: Optional[str] = None
    association: Optional[str] = None
    location_context: Optional[str] = None
    # Personal characteristics
    interests: Optional[str] = None
    personality: Optional[str] = None
    values: Optional[str] = None
    social_behavior: Optional[str] = None


class PersonalContactUpdate(BaseModel):
    """Update personal contact request."""
    name: Optional[str] = None
    nickname: Optional[str] = None
    relationship: Optional[str] = None
    photo_url: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    association: Optional[str] = None
    location_context: Optional[str] = None
    # Personal characteristics
    interests: Optional[str] = None
    personality: Optional[str] = None
    values: Optional[str] = None
    social_behavior: Optional[str] = None


class PersonalContactResponse(BaseModel):
    """Personal contact response."""
    id: str
    user_id: str
    name: str
    nickname: Optional[str] = None
    relationship: str
    photo_url: str
    category: Optional[str] = None
    first_letter: Optional[str] = None
    description: Optional[str] = None
    association: Optional[str] = None
    location_context: Optional[str] = None
    # Personal characteristics
    interests: Optional[str] = None
    personality: Optional[str] = None
    values: Optional[str] = None
    social_behavior: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class LifeWordsStatusResponse(BaseModel):
    """Life words status response."""
    contact_count: int
    can_start_session: bool
    min_contacts_required: int = 2


class LifeWordsSessionCreate(BaseModel):
    """Create life words session request."""
    contact_ids: Optional[list[str]] = None  # None = use all active contacts


class LifeWordsSessionResponse(BaseModel):
    """Life words session response."""
    id: str
    user_id: str
    contact_ids: list[str]
    is_completed: bool
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_correct: int
    total_incorrect: int
    average_cues_used: float
    average_response_time: float
    contacts: Optional[list[PersonalContactResponse]] = None


class LifeWordsResponseCreate(BaseModel):
    """Life words response submission."""
    contact_id: str
    is_correct: bool
    cues_used: int = 0
    response_time: Optional[float] = None
    user_answer: Optional[str] = None
    correct_answer: str
    speech_confidence: Optional[float] = None


# Contact Invite Schemas
class ContactInviteCreate(BaseModel):
    """Create contact invite request."""
    recipient_email: EmailStr
    recipient_name: str
    custom_message: Optional[str] = None


class ContactInviteResponse(BaseModel):
    """Contact invite response."""
    id: str
    user_id: str
    recipient_email: str
    recipient_name: str
    custom_message: Optional[str] = None
    status: str
    created_at: datetime
    expires_at: datetime
    completed_at: Optional[datetime] = None
    contact_id: Optional[str] = None


class InviteVerifyResponse(BaseModel):
    """Verify invite token response."""
    valid: bool
    status: str  # 'pending', 'completed', 'expired', 'not_found'
    inviter_name: Optional[str] = None
    recipient_name: Optional[str] = None
    contact_name: Optional[str] = None


class InviteSubmitRequest(BaseModel):
    """Submit invite form request (public endpoint)."""
    name: str
    nickname: Optional[str] = None
    relationship: str
    photo_url: str
    category: Optional[str] = None
    description: Optional[str] = None
    association: Optional[str] = None
    location_context: Optional[str] = None
    # Personal characteristics
    interests: Optional[str] = None
    personality: Optional[str] = None
    values: Optional[str] = None
    social_behavior: Optional[str] = None


class InviteSubmitResponse(BaseModel):
    """Submit invite form response."""
    success: bool
    message: str
    contact_name: Optional[str] = None
