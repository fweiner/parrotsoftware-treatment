"""Life Words Question-Based Recall endpoints."""
import random
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.core.dependencies import CurrentUserId, Database
from app.models.schemas import (
    LifeWordsQuestionSessionCreate,
    LifeWordsQuestionSessionResponse,
    LifeWordsQuestionResponseCreate,
    GeneratedQuestion,
    QuestionType,
)
import traceback

router = APIRouter()

MIN_CONTACTS_REQUIRED = 2


def generate_questions_for_contacts(contacts: List[Dict[str, Any]]) -> List[GeneratedQuestion]:
    """Generate 5 questions using data from the provided contacts."""
    questions = []

    # We need at least 2 contacts
    if len(contacts) < 2:
        return questions

    # Shuffle contacts to randomize which ones get used
    shuffled = contacts.copy()
    random.shuffle(shuffled)

    # Question 1: Relationship recall (use first contact)
    c1 = shuffled[0]
    questions.append(GeneratedQuestion(
        contact_id=c1["id"],
        contact_name=c1["name"],
        contact_photo_url=c1["photo_url"],
        question_type=QuestionType.RELATIONSHIP,
        question_text=f"What is {c1['name']}'s relationship to you?",
        expected_answer=c1["relationship"],
        acceptable_answers=[c1["relationship"].lower(), c1["relationship"].title()]
    ))

    # Question 2: Association/Context recall (use second contact if has data)
    c2 = shuffled[1] if len(shuffled) > 1 else shuffled[0]
    location = c2.get("location_context") or c2.get("association") or "at home"
    questions.append(GeneratedQuestion(
        contact_id=c2["id"],
        contact_name=c2["name"],
        contact_photo_url=c2["photo_url"],
        question_type=QuestionType.ASSOCIATION,
        question_text=f"Where do you usually see {c2['name']}?",
        expected_answer=location,
        acceptable_answers=[location.lower()] if location else []
    ))

    # Question 3: Interests recall (cycle back if needed)
    c3 = shuffled[0]
    interests = c3.get("interests") or "spending time together"
    questions.append(GeneratedQuestion(
        contact_id=c3["id"],
        contact_name=c3["name"],
        contact_photo_url=c3["photo_url"],
        question_type=QuestionType.INTERESTS,
        question_text=f"What does {c3['name']} enjoy doing?",
        expected_answer=interests,
        acceptable_answers=[interests.lower()] if interests else []
    ))

    # Question 4: Personality recall (use second contact)
    c4 = shuffled[1] if len(shuffled) > 1 else shuffled[0]
    personality = c4.get("personality") or c4.get("description") or "kind and caring"
    questions.append(GeneratedQuestion(
        contact_id=c4["id"],
        contact_name=c4["name"],
        contact_photo_url=c4["photo_url"],
        question_type=QuestionType.PERSONALITY,
        question_text=f"How would you describe {c4['name']}'s personality?",
        expected_answer=personality,
        acceptable_answers=[personality.lower()] if personality else []
    ))

    # Question 5: Name from description (reverse recall)
    c5 = shuffled[0]
    relationship = c5["relationship"]
    hint = c5.get("interests") or c5.get("description") or c5.get("personality") or "is special to you"
    questions.append(GeneratedQuestion(
        contact_id=c5["id"],
        contact_name=c5["name"],
        contact_photo_url=c5["photo_url"],
        question_type=QuestionType.NAME_FROM_DESC,
        question_text=f"Who is your {relationship} who {hint}?",
        expected_answer=c5["name"],
        acceptable_answers=[
            c5["name"].lower(),
            c5["name"].split()[0].lower() if " " in c5["name"] else c5["name"].lower(),
            c5.get("nickname", "").lower() if c5.get("nickname") else ""
        ]
    ))

    return questions


def evaluate_answer(user_answer: str, expected: str, acceptable: List[str]) -> tuple[bool, bool, float]:
    """
    Evaluate if user's answer matches expected.
    Returns (is_correct, is_partial, correctness_score)
    """
    if not user_answer:
        return False, False, 0.0

    user_lower = user_answer.lower().strip()
    expected_lower = expected.lower().strip()

    # Exact match
    if user_lower == expected_lower:
        return True, False, 1.0

    # Check acceptable alternatives
    for alt in acceptable:
        if alt and user_lower == alt.lower():
            return True, False, 1.0

    # Partial match - user answer contains expected or vice versa
    if expected_lower in user_lower or user_lower in expected_lower:
        return True, True, 0.8

    # Check if any word matches
    user_words = set(user_lower.split())
    expected_words = set(expected_lower.split())
    common = user_words & expected_words

    if common:
        score = len(common) / max(len(user_words), len(expected_words))
        return score >= 0.5, True, score

    return False, False, 0.0


# ============== Question Sessions ==============

@router.post("/question-sessions")
async def create_question_session(
    session_data: LifeWordsQuestionSessionCreate,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Create a new question-based session and generate questions."""
    try:
        # Get contacts
        if session_data.contact_ids:
            contacts = await db.query(
                "personal_contacts",
                select="*",
                filters={"user_id": user_id, "is_active": True}
            )
            contacts = [c for c in contacts if c["id"] in session_data.contact_ids]
        else:
            contacts = await db.query(
                "personal_contacts",
                select="*",
                filters={"user_id": user_id, "is_active": True}
            )

        if not contacts or len(contacts) < MIN_CONTACTS_REQUIRED:
            raise HTTPException(
                status_code=400,
                detail=f"At least {MIN_CONTACTS_REQUIRED} contacts required"
            )

        contact_ids = [c["id"] for c in contacts]

        # Create session
        session = await db.insert(
            "life_words_question_sessions",
            {
                "user_id": user_id,
                "contact_ids": contact_ids,
                "is_completed": False,
                "total_questions": 5,
                "total_correct": 0,
                "average_response_time": 0,
                "average_clarity_score": 0,
            }
        )

        # Generate questions
        questions = generate_questions_for_contacts(contacts)

        return {
            "session": session[0],
            "questions": [q.model_dump() for q in questions],
            "contacts": contacts
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/question-sessions/{session_id}")
async def get_question_session(
    session_id: str,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Get question session with responses."""
    try:
        sessions = await db.query(
            "life_words_question_sessions",
            select="*",
            filters={"id": session_id, "user_id": user_id}
        )

        if not sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        session = sessions[0]

        # Get responses
        responses = await db.query(
            "life_words_question_responses",
            select="*",
            filters={"session_id": session_id},
            order="created_at"
        )

        # Get contacts for regenerating questions if needed
        contacts = await db.query(
            "personal_contacts",
            select="*",
            filters={"user_id": user_id}
        )
        session_contacts = [c for c in contacts if c["id"] in session["contact_ids"]]

        return {
            "session": session,
            "responses": responses or [],
            "contacts": session_contacts
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/question-sessions/{session_id}/responses")
async def save_question_response(
    session_id: str,
    response_data: LifeWordsQuestionResponseCreate,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Save a response to a question."""
    try:
        # Verify session
        sessions = await db.query(
            "life_words_question_sessions",
            select="*",
            filters={"id": session_id, "user_id": user_id}
        )

        if not sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        # Save response
        response = await db.insert(
            "life_words_question_responses",
            {
                "session_id": session_id,
                "user_id": user_id,
                "contact_id": response_data.contact_id,
                "question_type": response_data.question_type,
                "question_text": response_data.question_text,
                "expected_answer": response_data.expected_answer,
                "user_answer": response_data.user_answer,
                "is_correct": response_data.is_correct,
                "is_partial": response_data.is_partial,
                "response_time": response_data.response_time,
                "clarity_score": response_data.clarity_score,
                "correctness_score": response_data.correctness_score,
            }
        )

        return {"response": response[0]}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/question-sessions/{session_id}/complete")
async def complete_question_session(
    session_id: str,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Complete a question session and calculate statistics."""
    try:
        # Verify session
        sessions = await db.query(
            "life_words_question_sessions",
            select="*",
            filters={"id": session_id, "user_id": user_id}
        )

        if not sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get all responses
        responses = await db.query(
            "life_words_question_responses",
            select="*",
            filters={"session_id": session_id}
        )

        if not responses:
            raise HTTPException(status_code=400, detail="No responses found")

        # Calculate statistics
        total_correct = sum(1 for r in responses if r["is_correct"])
        total_partial = sum(1 for r in responses if r["is_partial"] and not r["is_correct"])

        response_times = [r["response_time"] for r in responses if r["response_time"]]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0

        clarity_scores = [r["clarity_score"] for r in responses if r["clarity_score"] is not None]
        avg_clarity = sum(clarity_scores) / len(clarity_scores) if clarity_scores else 0

        correctness_scores = [r["correctness_score"] for r in responses if r["correctness_score"] is not None]
        avg_correctness = sum(correctness_scores) / len(correctness_scores) if correctness_scores else 0

        statistics = {
            "total_questions": len(responses),
            "total_correct": total_correct,
            "total_partial": total_partial,
            "accuracy_percentage": round((total_correct / len(responses)) * 100, 1),
            "average_response_time_ms": round(avg_response_time, 0),
            "average_clarity_score": round(avg_clarity, 2),
            "average_correctness_score": round(avg_correctness, 2),
            "by_question_type": {}
        }

        # Group by question type
        for r in responses:
            qt = str(r["question_type"])
            if qt not in statistics["by_question_type"]:
                statistics["by_question_type"][qt] = {
                    "correct": 0,
                    "total": 0,
                    "avg_time": 0
                }
            statistics["by_question_type"][qt]["total"] += 1
            if r["is_correct"]:
                statistics["by_question_type"][qt]["correct"] += 1

        # Update session
        updated = await db.update(
            "life_words_question_sessions",
            {"id": session_id},
            {
                "is_completed": True,
                "completed_at": "now()",
                "total_correct": total_correct,
                "average_response_time": round(avg_response_time, 2),
                "average_clarity_score": round(avg_clarity, 2),
                "statistics": statistics
            }
        )

        return {"session": updated, "statistics": statistics}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate-answer")
async def evaluate_answer_endpoint(
    user_id: CurrentUserId,
    expected_answer: str,
    user_answer: str,
    acceptable_answers: List[str] = []
) -> Dict[str, Any]:
    """Evaluate an answer against expected (utility endpoint)."""
    is_correct, is_partial, score = evaluate_answer(user_answer, expected_answer, acceptable_answers)
    return {
        "is_correct": is_correct,
        "is_partial": is_partial,
        "correctness_score": score
    }
