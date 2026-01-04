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
    # Voice preference
    voice_gender: Optional[str] = None  # 'male', 'female', or 'neutral'
    # Answer matching accommodations
    match_acceptable_alternatives: Optional[bool] = None
    match_partial_substring: Optional[bool] = None
    match_word_overlap: Optional[bool] = None
    match_stop_word_filtering: Optional[bool] = None
    match_synonyms: Optional[bool] = None
    match_first_name_only: Optional[bool] = None


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
    # Voice preference
    voice_gender: Optional[str] = None  # 'male', 'female', or 'neutral'
    # Answer matching accommodations
    match_acceptable_alternatives: Optional[bool] = True
    match_partial_substring: Optional[bool] = True
    match_word_overlap: Optional[bool] = True
    match_stop_word_filtering: Optional[bool] = True
    match_synonyms: Optional[bool] = True
    match_first_name_only: Optional[bool] = True
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


# Personal Items (My Stuff) Schemas
class PersonalItemCreate(BaseModel):
    """Create personal item request."""
    name: str
    photo_url: str
    purpose: Optional[str] = None
    features: Optional[str] = None
    category: Optional[str] = None
    size: Optional[str] = None
    shape: Optional[str] = None
    color: Optional[str] = None
    weight: Optional[str] = None
    location: Optional[str] = None
    associated_with: Optional[str] = None


class PersonalItemUpdate(BaseModel):
    """Update personal item request."""
    name: Optional[str] = None
    photo_url: Optional[str] = None
    purpose: Optional[str] = None
    features: Optional[str] = None
    category: Optional[str] = None
    size: Optional[str] = None
    shape: Optional[str] = None
    color: Optional[str] = None
    weight: Optional[str] = None
    location: Optional[str] = None
    associated_with: Optional[str] = None


class PersonalItemResponse(BaseModel):
    """Personal item response."""
    id: str
    user_id: str
    name: str
    photo_url: str
    purpose: Optional[str] = None
    features: Optional[str] = None
    category: Optional[str] = None
    size: Optional[str] = None
    shape: Optional[str] = None
    color: Optional[str] = None
    weight: Optional[str] = None
    location: Optional[str] = None
    associated_with: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


# Direct Messaging Schemas
class MessageCreate(BaseModel):
    """Create message request (authenticated user)."""
    text_content: Optional[str] = None
    photo_url: Optional[str] = None
    voice_url: Optional[str] = None
    voice_duration_seconds: Optional[int] = None


class PublicMessageCreate(BaseModel):
    """Create message request (public contact endpoint)."""
    text_content: Optional[str] = None
    photo_url: Optional[str] = None
    voice_url: Optional[str] = None
    voice_duration_seconds: Optional[int] = None


class MessageResponse(BaseModel):
    """Message response."""
    id: str
    user_id: str
    contact_id: str
    direction: str  # 'user_to_contact' or 'contact_to_user'
    text_content: Optional[str] = None
    photo_url: Optional[str] = None
    voice_url: Optional[str] = None
    voice_duration_seconds: Optional[int] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class ConversationSummary(BaseModel):
    """Conversation summary for inbox list."""
    contact_id: str
    contact_name: str
    contact_photo_url: str
    contact_relationship: str
    last_message_text: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_message_direction: Optional[str] = None
    unread_count: int
    has_messaging_token: bool


class MessagingTokenResponse(BaseModel):
    """Messaging token response."""
    id: str
    contact_id: str
    token: str
    messaging_url: str
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None


class MessagingTokenVerifyResponse(BaseModel):
    """Verify messaging token response (public)."""
    valid: bool
    status: str  # 'active', 'inactive', 'not_found'
    user_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_photo_url: Optional[str] = None


# Short-Term Memory Schemas
class STMGroceryItemResponse(BaseModel):
    """Grocery item response."""
    id: str
    name: str
    category: str


class STMSessionCreate(BaseModel):
    """Create short-term memory session request."""
    list_length: int = Field(..., ge=2, le=5, description="Number of items per list (2-5)")


class STMSessionResponse(BaseModel):
    """Short-term memory session response."""
    id: str
    user_id: str
    list_length: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_correct: int
    total_trials: int


class STMTrialCreate(BaseModel):
    """Create a trial within a session."""
    session_id: str
    trial_number: int = Field(..., ge=1, le=10)
    item_ids: list[str]  # List of grocery item IDs for this trial


class STMTrialResponse(BaseModel):
    """Trial response."""
    id: str
    session_id: str
    trial_number: int
    list_length: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    items_correct: int
    is_fully_correct: bool
    items: Optional[list[STMGroceryItemResponse]] = None


class STMRecallAttemptCreate(BaseModel):
    """Record a recall attempt."""
    trial_id: str
    target_item_name: str
    spoken_item: Optional[str] = None
    match_confidence: Optional[float] = Field(None, ge=0, le=1)
    is_correct: bool
    is_partial: bool = False
    time_to_recall: Optional[int] = None  # milliseconds


class STMRecallAttemptResponse(BaseModel):
    """Recall attempt response."""
    id: str
    trial_id: str
    target_item_name: str
    spoken_item: Optional[str] = None
    match_confidence: Optional[float] = None
    is_correct: bool
    is_partial: bool
    time_to_recall: Optional[int] = None
    created_at: datetime


class STMCompleteTrialRequest(BaseModel):
    """Complete a trial with recall attempts."""
    recall_attempts: list[STMRecallAttemptCreate]


class STMProgressResponse(BaseModel):
    """User's STM progress statistics."""
    total_sessions: int
    total_trials: int
    total_items_correct: int
    average_accuracy: float
    max_list_length: int


class STMSessionListResponse(BaseModel):
    """List of recent sessions."""
    sessions: list[STMSessionResponse]
    progress: STMProgressResponse


# Life Words Question Session Schemas
class QuestionType:
    """Question types for Life Words recall."""
    RELATIONSHIP = 1  # "What is [Name]'s relationship to you?"
    ASSOCIATION = 2   # "Where do you usually see [Name]?"
    INTERESTS = 3     # "What does [Name] enjoy doing?"
    PERSONALITY = 4   # "How would you describe [Name]?"
    NAME_FROM_DESC = 5  # "Who is your [relationship] who likes [interest]?"


class LifeWordsQuestionSessionCreate(BaseModel):
    """Create question session request."""
    contact_ids: Optional[list[str]] = None  # None = use all active contacts


class LifeWordsQuestionSessionResponse(BaseModel):
    """Question session response."""
    id: str
    user_id: str
    contact_ids: list[str]
    is_completed: bool
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_questions: int
    total_correct: int
    average_response_time: float
    average_clarity_score: float
    statistics: Optional[Dict[str, Any]] = None


class GeneratedQuestion(BaseModel):
    """A generated question about a contact."""
    contact_id: str
    contact_name: str
    contact_photo_url: str
    question_type: int
    question_text: str
    expected_answer: str
    acceptable_answers: list[str]  # Alternative correct answers


class LifeWordsQuestionResponseCreate(BaseModel):
    """Submit answer to a question."""
    contact_id: str
    question_type: int
    question_text: str
    expected_answer: str
    user_answer: Optional[str] = None
    is_correct: bool
    is_partial: bool = False
    response_time: Optional[int] = None  # milliseconds
    clarity_score: Optional[float] = Field(None, ge=0, le=1)  # speech confidence
    correctness_score: Optional[float] = Field(None, ge=0, le=1)  # semantic match


class LifeWordsQuestionResponseResponse(BaseModel):
    """Question response record."""
    id: str
    session_id: str
    contact_id: str
    question_type: int
    question_text: str
    expected_answer: str
    user_answer: Optional[str] = None
    is_correct: bool
    is_partial: bool
    response_time: Optional[int] = None
    clarity_score: Optional[float] = None
    correctness_score: Optional[float] = None
    created_at: datetime
