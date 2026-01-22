"""Life Words Information Practice endpoints."""
import random
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.core.dependencies import CurrentUserId, Database
from app.models.schemas import (
    InformationItem,
    InformationStatusResponse,
    LifeWordsInformationSessionCreate,
    LifeWordsInformationSessionResponse,
    LifeWordsInformationResponseCreate,
)
import traceback

router = APIRouter()

MIN_FIELDS_REQUIRED = 5

# Profile fields that can be practiced
PRACTICE_FIELDS = {
    "phone_number": {
        "label": "phone number",
        "teach_template": "Your phone number is {value}",
        "question": "What is your phone number?",
        "hint_type": "first_digit",
    },
    "address_city": {
        "label": "city",
        "teach_template": "You live in {value}",
        "question": "What city do you live in?",
        "hint_type": "first_letter",
    },
    "address_state": {
        "label": "state",
        "teach_template": "You live in the state of {value}",
        "question": "What state do you live in?",
        "hint_type": "first_letter",
    },
    "address_zip": {
        "label": "zip code",
        "teach_template": "Your zip code is {value}",
        "question": "What is your zip code?",
        "hint_type": "first_digit",
    },
    "date_of_birth": {
        "label": "birthday",
        "teach_template": "Your birthday is {value}",
        "question": "When is your birthday?",
        "hint_type": "first_letter",  # Will use month's first letter
    },
    "full_name": {
        "label": "full name",
        "teach_template": "Your full name is {value}",
        "question": "What is your full name?",
        "hint_type": "first_letter",
    },
    "job": {
        "label": "job",
        "teach_template": "Your job is {value}",
        "question": "What is your job?",
        "hint_type": "first_letter",
    },
    "marital_status": {
        "label": "marital status",
        "teach_template": "Your marital status is {value}",
        "question": "What is your marital status?",
        "hint_type": "first_letter",
    },
    "number_of_children": {
        "label": "number of children",
        "teach_template": "You have {value} children",
        "question": "How many children do you have?",
        "hint_type": "first_digit",
    },
    "favorite_food": {
        "label": "favorite food",
        "teach_template": "Your favorite food is {value}",
        "question": "What is your favorite food?",
        "hint_type": "first_letter",
    },
    "favorite_music": {
        "label": "favorite music",
        "teach_template": "Your favorite music is {value}",
        "question": "What is your favorite music?",
        "hint_type": "first_letter",
    },
    "hair_color": {
        "label": "hair color",
        "teach_template": "Your hair color is {value}",
        "question": "What is your hair color?",
        "hint_type": "first_letter",
    },
    "eye_color": {
        "label": "eye color",
        "teach_template": "Your eye color is {value}",
        "question": "What is your eye color?",
        "hint_type": "first_letter",
    },
}


def format_phone_for_tts(phone: str) -> str:
    """Format phone number for TTS to read digits individually."""
    # Extract only digits
    digits = ''.join(c for c in str(phone) if c.isdigit())
    if len(digits) == 10:
        # Format as (XXX) XXX-XXXX with spaces for TTS
        return f"{digits[0]} {digits[1]} {digits[2]}, {digits[3]} {digits[4]} {digits[5]}, {digits[6]} {digits[7]} {digits[8]} {digits[9]}"
    elif len(digits) == 7:
        # Format as XXX-XXXX
        return f"{digits[0]} {digits[1]} {digits[2]}, {digits[3]} {digits[4]} {digits[5]} {digits[6]}"
    else:
        # Just space out all digits
        return ' '.join(digits)


def format_zip_for_tts(zip_code: str) -> str:
    """Format zip code for TTS to read digits individually."""
    digits = ''.join(c for c in str(zip_code) if c.isdigit())
    return ' '.join(digits)


def format_date_for_display(date_value) -> str:
    """Format a date value for display."""
    if date_value is None:
        return ""
    if isinstance(date_value, str):
        # Try parsing various formats
        try:
            from datetime import datetime as dt
            parsed = dt.fromisoformat(date_value.replace("Z", "+00:00"))
            return parsed.strftime("%B %d")  # e.g., "January 15"
        except (ValueError, AttributeError):
            return date_value
    if hasattr(date_value, "strftime"):
        return date_value.strftime("%B %d")  # e.g., "January 15"
    return str(date_value)


def generate_hint(value: str, hint_type: str) -> str:
    """Generate a hint based on the value and hint type."""
    if not value:
        return ""

    value_str = str(value).strip()

    if hint_type == "first_letter":
        first_char = value_str[0].upper() if value_str else ""
        return f"It starts with the letter {first_char}"
    elif hint_type == "first_digit":
        # Find first digit in the value
        for char in value_str:
            if char.isdigit():
                return f"The first digit is {char}"
        # Fallback to first character
        first_char = value_str[0] if value_str else ""
        return f"It starts with {first_char}"

    return f"The first character is {value_str[0] if value_str else ''}"


def generate_information_items(profile: Dict[str, Any]) -> List[InformationItem]:
    """Generate up to 5 information items from the user's profile."""
    items = []

    # Collect all filled fields
    filled_fields = []
    for field_name, config in PRACTICE_FIELDS.items():
        value = profile.get(field_name)
        if value is not None and str(value).strip():
            filled_fields.append((field_name, config, value))

    # Shuffle and pick up to 5
    random.shuffle(filled_fields)
    selected = filled_fields[:5]

    for field_name, config, value in selected:
        # Format the value for display (used for answer matching)
        if field_name == "date_of_birth":
            display_value = format_date_for_display(value)
        elif field_name == "number_of_children":
            display_value = str(value)
        else:
            display_value = str(value)

        # Format for TTS (spoken version - digits read individually)
        if field_name == "phone_number":
            tts_value = format_phone_for_tts(value)
        elif field_name == "address_zip":
            tts_value = format_zip_for_tts(value)
        else:
            tts_value = display_value

        # Generate hint
        hint_value = display_value
        if field_name == "date_of_birth":
            # Use month's first letter for date hints
            hint_value = display_value.split()[0] if display_value else ""
        hint_text = generate_hint(hint_value, config["hint_type"])

        items.append(InformationItem(
            field_name=field_name,
            field_label=config["label"],
            teach_text=config["teach_template"].format(value=tts_value),
            question_text=config["question"],
            expected_answer=display_value,
            hint_text=hint_text,
        ))

    return items


def get_filled_fields_count(profile: Dict[str, Any]) -> int:
    """Count how many practice fields are filled in the profile."""
    count = 0
    for field_name in PRACTICE_FIELDS.keys():
        value = profile.get(field_name)
        if value is not None and str(value).strip():
            count += 1
    return count


# ============== Information Status ==============

@router.get("/information-status")
async def get_information_status(
    user_id: CurrentUserId,
    db: Database
) -> InformationStatusResponse:
    """Check if user has enough profile data for information practice."""
    try:
        # Get user profile
        profiles = await db.query(
            "profiles",
            select="*",
            filters={"id": user_id}
        )

        if not profiles:
            return InformationStatusResponse(
                can_start_session=False,
                filled_fields_count=0,
                min_fields_required=MIN_FIELDS_REQUIRED
            )

        profile = profiles[0]
        filled_count = get_filled_fields_count(profile)

        return InformationStatusResponse(
            can_start_session=filled_count >= MIN_FIELDS_REQUIRED,
            filled_fields_count=filled_count,
            min_fields_required=MIN_FIELDS_REQUIRED
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============== Information Sessions ==============

@router.post("/information-sessions")
async def create_information_session(
    session_data: LifeWordsInformationSessionCreate,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Create a new information practice session with 5 random items."""
    try:
        # Get user profile
        profiles = await db.query(
            "profiles",
            select="*",
            filters={"id": user_id}
        )

        if not profiles:
            raise HTTPException(
                status_code=400,
                detail="Profile not found"
            )

        profile = profiles[0]

        # Check if user has enough filled fields
        filled_count = get_filled_fields_count(profile)
        if filled_count < MIN_FIELDS_REQUIRED:
            raise HTTPException(
                status_code=400,
                detail=f"At least {MIN_FIELDS_REQUIRED} profile fields required. You have {filled_count}."
            )

        # Generate information items
        items = generate_information_items(profile)

        if len(items) < 1:
            raise HTTPException(
                status_code=400,
                detail="Not enough profile data to generate practice items"
            )

        # Create session
        session = await db.insert(
            "life_words_information_sessions",
            {
                "user_id": user_id,
                "is_completed": False,
                "total_items": len(items),
                "total_correct": 0,
                "total_hints_used": 0,
                "total_timeouts": 0,
                "average_response_time": 0,
            }
        )

        return {
            "session": session[0],
            "items": [item.model_dump() for item in items]
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/information-sessions/{session_id}")
async def get_information_session(
    session_id: str,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Get information session with responses."""
    try:
        sessions = await db.query(
            "life_words_information_sessions",
            select="*",
            filters={"id": session_id, "user_id": user_id}
        )

        if not sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        session = sessions[0]

        # Get responses
        responses = await db.query(
            "life_words_information_responses",
            select="*",
            filters={"session_id": session_id},
            order="created_at"
        )

        return {
            "session": session,
            "responses": responses or []
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/information-sessions/{session_id}/responses")
async def save_information_response(
    session_id: str,
    response_data: LifeWordsInformationResponseCreate,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Save a response to an information item."""
    try:
        # Verify session
        sessions = await db.query(
            "life_words_information_sessions",
            select="*",
            filters={"id": session_id, "user_id": user_id}
        )

        if not sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        # Save response
        response = await db.insert(
            "life_words_information_responses",
            {
                "session_id": session_id,
                "user_id": user_id,
                "field_name": response_data.field_name,
                "field_label": response_data.field_label,
                "teach_text": response_data.teach_text,
                "question_text": response_data.question_text,
                "expected_answer": response_data.expected_answer,
                "hint_text": response_data.hint_text,
                "user_answer": response_data.user_answer,
                "is_correct": response_data.is_correct,
                "used_hint": response_data.used_hint,
                "timed_out": response_data.timed_out,
                "response_time": response_data.response_time,
            }
        )

        return {"response": response[0]}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/information-sessions/{session_id}/complete")
async def complete_information_session(
    session_id: str,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Complete an information session and calculate statistics."""
    try:
        # Verify session
        sessions = await db.query(
            "life_words_information_sessions",
            select="*",
            filters={"id": session_id, "user_id": user_id}
        )

        if not sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get all responses
        responses = await db.query(
            "life_words_information_responses",
            select="*",
            filters={"session_id": session_id}
        )

        if not responses:
            raise HTTPException(status_code=400, detail="No responses found")

        # Calculate statistics
        total_correct = sum(1 for r in responses if r["is_correct"])
        total_hints_used = sum(1 for r in responses if r["used_hint"])
        total_timeouts = sum(1 for r in responses if r["timed_out"])

        response_times = [r["response_time"] for r in responses if r["response_time"]]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0

        statistics = {
            "total_items": len(responses),
            "total_correct": total_correct,
            "total_hints_used": total_hints_used,
            "total_timeouts": total_timeouts,
            "accuracy_percentage": round((total_correct / len(responses)) * 100, 1) if responses else 0,
            "average_response_time_ms": round(avg_response_time, 0),
            "by_field": {}
        }

        # Group by field
        for r in responses:
            field = r["field_name"]
            statistics["by_field"][field] = {
                "is_correct": r["is_correct"],
                "used_hint": r["used_hint"],
                "timed_out": r["timed_out"],
                "response_time": r["response_time"]
            }

        # Update session
        updated = await db.update(
            "life_words_information_sessions",
            {"id": session_id},
            {
                "is_completed": True,
                "completed_at": "now()",
                "total_correct": total_correct,
                "total_hints_used": total_hints_used,
                "total_timeouts": total_timeouts,
                "average_response_time": round(avg_response_time, 2),
                "statistics": statistics
            }
        )

        return {"session": updated, "statistics": statistics}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
