"""Word Finding treatment endpoints."""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.core.dependencies import CurrentUserId, Database
from app.models.schemas import WordFindingSessionCreate, WordFindingResponse
import random
import traceback

router = APIRouter()


@router.post("/sessions")
async def create_word_finding_session(
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Create a new word-finding session with 10 random stimuli."""
    try:
        # Get all stimuli
        stimuli = await db.query(
            "word_finding_stimuli",
            select="*",
            order="id.asc"
        )

        if not stimuli or len(stimuli) < 10:
            raise HTTPException(
                status_code=500,
                detail="Not enough stimuli in database. Please run word-finding migrations."
            )

        # Select 10 random stimuli
        selected = random.sample(stimuli, 10)
        stimuli_ids = [s["id"] for s in selected]

        # Create session
        session = await db.insert(
            "word_finding_sessions",
            {
                "user_id": user_id,
                "stimuli_ids": stimuli_ids,
                "is_completed": False
            }
        )

        return {
            "session": session[0],
            "stimuli": selected
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}")
async def get_word_finding_session(
    session_id: str,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Get session details with responses."""
    try:
        # Get session
        session = await db.query(
            "word_finding_sessions",
            select="*",
            filters={"id": session_id, "user_id": user_id}
        )

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get responses
        responses = await db.query(
            "word_finding_responses",
            select="*",
            filters={"session_id": session_id},
            order="completed_at.asc"
        )

        return {
            "session": session[0],
            "responses": responses or []
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/responses")
async def save_word_finding_response(
    session_id: str,
    response_data: Dict[str, Any],
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Save a response for a stimulus."""
    try:
        # Verify session belongs to user
        session = await db.query(
            "word_finding_sessions",
            select="*",
            filters={"id": session_id, "user_id": user_id}
        )

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Save response
        response = await db.insert(
            "word_finding_responses",
            {
                "session_id": session_id,
                "stimulus_id": response_data.get("stimulus_id"),
                "is_correct": response_data.get("is_correct"),
                "cues_used": response_data.get("cues_used", 0),
                "response_time": response_data.get("response_time"),
                "user_answer": response_data.get("user_answer"),
                "correct_answer": response_data.get("correct_answer")
            }
        )

        return {"response": response[0]}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sessions/{session_id}/complete")
async def complete_word_finding_session(
    session_id: str,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Mark session as completed and calculate statistics."""
    try:
        # Get all responses
        responses = await db.query(
            "word_finding_responses",
            select="*",
            filters={"session_id": session_id}
        )

        if not responses:
            raise HTTPException(status_code=404, detail="No responses found")

        # Calculate statistics
        total_correct = sum(1 for r in responses if r["is_correct"])
        total_incorrect = len(responses) - total_correct
        avg_cues = sum(r["cues_used"] for r in responses) / len(responses)
        avg_time = sum(r["response_time"] or 0 for r in responses) / len(responses)

        # Update session
        updated = await db.update(
            "word_finding_sessions",
            {"id": session_id},
            {
                "is_completed": True,
                "completed_at": "now()",
                "total_correct": total_correct,
                "total_incorrect": total_incorrect,
                "average_cues_used": round(avg_cues, 2),
                "average_response_time": round(avg_time, 2)
            }
        )

        return {"session": updated}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stimuli")
async def get_all_stimuli(db: Database) -> List[Dict[str, Any]]:
    """Get all available stimuli."""
    try:
        stimuli = await db.query(
            "word_finding_stimuli",
            select="*",
            order="id.asc"
        )

        return stimuli or []

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
