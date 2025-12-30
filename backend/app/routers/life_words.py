"""Find My Life Words treatment endpoints."""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from app.core.dependencies import CurrentUserId, Database
from app.models.schemas import (
    PersonalContactCreate,
    PersonalContactUpdate,
    PersonalContactResponse,
    LifeWordsStatusResponse,
    LifeWordsSessionCreate,
    LifeWordsSessionResponse,
    LifeWordsResponseCreate
)
import traceback

router = APIRouter()

MIN_CONTACTS_REQUIRED = 2


# ============== Status ==============

@router.get("/status")
async def get_life_words_status(
    user_id: CurrentUserId,
    db: Database
) -> LifeWordsStatusResponse:
    """Get user's life words setup status."""
    try:
        # Count active contacts
        contacts = await db.query(
            "personal_contacts",
            select="id",
            filters={"user_id": user_id, "is_active": True}
        )

        contact_count = len(contacts) if contacts else 0

        return LifeWordsStatusResponse(
            contact_count=contact_count,
            can_start_session=contact_count >= MIN_CONTACTS_REQUIRED,
            min_contacts_required=MIN_CONTACTS_REQUIRED
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============== Personal Contacts ==============

@router.post("/contacts")
async def create_personal_contact(
    contact_data: PersonalContactCreate,
    user_id: CurrentUserId,
    db: Database
) -> PersonalContactResponse:
    """Create a new personal contact."""
    try:
        # Helper to convert empty strings to None
        def empty_to_none(val):
            return None if val == "" else val

        # Insert contact (first_letter is auto-derived by DB trigger)
        contact = await db.insert(
            "personal_contacts",
            {
                "user_id": user_id,
                "name": contact_data.name,
                "nickname": empty_to_none(contact_data.nickname),
                "relationship": contact_data.relationship,
                "photo_url": contact_data.photo_url,
                "category": empty_to_none(contact_data.category),
                "description": empty_to_none(contact_data.description),
                "association": empty_to_none(contact_data.association),
                "location_context": empty_to_none(contact_data.location_context),
                # Personal characteristics
                "interests": empty_to_none(contact_data.interests),
                "personality": empty_to_none(contact_data.personality),
                "values": empty_to_none(contact_data.values),
                "social_behavior": empty_to_none(contact_data.social_behavior)
            }
        )

        return PersonalContactResponse(**contact[0])

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contacts")
async def list_personal_contacts(
    user_id: CurrentUserId,
    db: Database,
    include_inactive: bool = False
) -> List[PersonalContactResponse]:
    """List user's personal contacts."""
    try:
        filters = {"user_id": user_id}
        if not include_inactive:
            filters["is_active"] = True

        contacts = await db.query(
            "personal_contacts",
            select="*",
            filters=filters,
            order="created_at.desc"
        )

        return [PersonalContactResponse(**c) for c in contacts] if contacts else []

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contacts/{contact_id}")
async def get_personal_contact(
    contact_id: str,
    user_id: CurrentUserId,
    db: Database
) -> PersonalContactResponse:
    """Get a specific personal contact."""
    try:
        contacts = await db.query(
            "personal_contacts",
            select="*",
            filters={"id": contact_id, "user_id": user_id}
        )

        if not contacts:
            raise HTTPException(status_code=404, detail="Contact not found")

        return PersonalContactResponse(**contacts[0])

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/contacts/{contact_id}")
async def update_personal_contact(
    contact_id: str,
    contact_data: PersonalContactUpdate,
    user_id: CurrentUserId,
    db: Database
) -> PersonalContactResponse:
    """Update a personal contact."""
    try:
        # Verify ownership
        existing = await db.query(
            "personal_contacts",
            select="id",
            filters={"id": contact_id, "user_id": user_id}
        )

        if not existing:
            raise HTTPException(status_code=404, detail="Contact not found")

        # Build update data (only non-None and non-empty fields)
        # Also convert empty strings to None for optional fields
        update_data = {}
        for k, v in contact_data.model_dump().items():
            if v is not None:
                # Convert empty strings to None for optional text fields
                if v == "":
                    update_data[k] = None
                else:
                    update_data[k] = v

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        updated = await db.update(
            "personal_contacts",
            {"id": contact_id},
            update_data
        )

        # Handle both list (from test mocks) and dict (from actual db.update)
        updated_data = updated[0] if isinstance(updated, list) else updated
        return PersonalContactResponse(**updated_data)

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/contacts/{contact_id}")
async def delete_personal_contact(
    contact_id: str,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Soft delete a personal contact (set is_active=false)."""
    try:
        # Verify ownership
        existing = await db.query(
            "personal_contacts",
            select="id",
            filters={"id": contact_id, "user_id": user_id}
        )

        if not existing:
            raise HTTPException(status_code=404, detail="Contact not found")

        # Soft delete
        await db.update(
            "personal_contacts",
            {"id": contact_id},
            {"is_active": False}
        )

        return {"success": True, "message": "Contact deactivated"}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============== Sessions ==============

@router.post("/sessions")
async def create_life_words_session(
    session_data: LifeWordsSessionCreate,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Create a new life words session."""
    try:
        # Get contacts to use
        if session_data.contact_ids:
            # Verify specified contacts exist and belong to user
            contacts = await db.query(
                "personal_contacts",
                select="*",
                filters={"user_id": user_id, "is_active": True}
            )
            contacts = [c for c in contacts if c["id"] in session_data.contact_ids]
        else:
            # Use all active contacts
            contacts = await db.query(
                "personal_contacts",
                select="*",
                filters={"user_id": user_id, "is_active": True}
            )

        if not contacts or len(contacts) < MIN_CONTACTS_REQUIRED:
            raise HTTPException(
                status_code=400,
                detail=f"At least {MIN_CONTACTS_REQUIRED} contacts required to start a session"
            )

        contact_ids = [c["id"] for c in contacts]

        # Create session
        session = await db.insert(
            "life_words_sessions",
            {
                "user_id": user_id,
                "contact_ids": contact_ids,
                "is_completed": False
            }
        )

        return {
            "session": session[0],
            "contacts": contacts
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}")
async def get_life_words_session(
    session_id: str,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Get session details with contacts and responses."""
    try:
        # Get session
        sessions = await db.query(
            "life_words_sessions",
            select="*",
            filters={"id": session_id, "user_id": user_id}
        )

        if not sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        session = sessions[0]

        # Get contacts for this session
        contacts = await db.query(
            "personal_contacts",
            select="*",
            filters={"user_id": user_id}
        )
        session_contacts = [c for c in contacts if c["id"] in session["contact_ids"]]

        # Get responses
        responses = await db.query(
            "life_words_responses",
            select="*",
            filters={"session_id": session_id},
            order="completed_at.asc"
        )

        return {
            "session": session,
            "contacts": session_contacts,
            "responses": responses or []
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/responses")
async def save_life_words_response(
    session_id: str,
    response_data: LifeWordsResponseCreate,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Save a response for a contact."""
    try:
        # Verify session belongs to user
        sessions = await db.query(
            "life_words_sessions",
            select="*",
            filters={"id": session_id, "user_id": user_id}
        )

        if not sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        # Save response
        response = await db.insert(
            "life_words_responses",
            {
                "session_id": session_id,
                "contact_id": response_data.contact_id,
                "user_id": user_id,
                "is_correct": response_data.is_correct,
                "cues_used": response_data.cues_used,
                "response_time": response_data.response_time,
                "user_answer": response_data.user_answer,
                "correct_answer": response_data.correct_answer,
                "speech_confidence": response_data.speech_confidence
            }
        )

        return {"response": response[0]}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sessions/{session_id}/complete")
async def complete_life_words_session(
    session_id: str,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Mark session as completed and calculate statistics."""
    try:
        # Verify session belongs to user
        sessions = await db.query(
            "life_words_sessions",
            select="*",
            filters={"id": session_id, "user_id": user_id}
        )

        if not sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get all responses
        responses = await db.query(
            "life_words_responses",
            select="*",
            filters={"session_id": session_id}
        )

        if not responses:
            raise HTTPException(status_code=400, detail="No responses found")

        # Calculate statistics
        total_correct = sum(1 for r in responses if r["is_correct"])
        total_incorrect = len(responses) - total_correct
        avg_cues = sum(r["cues_used"] for r in responses) / len(responses)
        avg_time = sum(float(r["response_time"] or 0) for r in responses) / len(responses)

        # Build detailed statistics
        statistics = {
            "responses_count": len(responses),
            "accuracy_percentage": round((total_correct / len(responses)) * 100, 1),
            "by_contact": {}
        }

        # Group stats by contact
        for r in responses:
            contact_id = r["contact_id"]
            if contact_id not in statistics["by_contact"]:
                statistics["by_contact"][contact_id] = {
                    "is_correct": r["is_correct"],
                    "cues_used": r["cues_used"],
                    "response_time": float(r["response_time"] or 0)
                }

        # Update session
        updated = await db.update(
            "life_words_sessions",
            {"id": session_id},
            {
                "is_completed": True,
                "completed_at": "now()",
                "total_correct": total_correct,
                "total_incorrect": total_incorrect,
                "average_cues_used": round(avg_cues, 2),
                "average_response_time": round(avg_time, 2),
                "statistics": statistics
            }
        )

        return {"session": updated}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
