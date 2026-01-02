"""Short-Term Memory treatment endpoints."""
from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from app.core.dependencies import CurrentUserId, Database
from app.models.schemas import (
    STMGroceryItemResponse,
    STMSessionCreate,
    STMSessionResponse,
    STMTrialResponse,
    STMCompleteTrialRequest,
    STMProgressResponse,
    STMSessionListResponse,
)

router = APIRouter()


@router.get("/grocery-items", response_model=List[STMGroceryItemResponse])
async def get_grocery_items(
    db: Database,
    user_id: CurrentUserId,
    count: int = 30
):
    """Get grocery items for display or selection."""
    items = await db.query(
        "stm_grocery_items",
        filters={},
        limit=count
    )
    return items


@router.get("/random-items", response_model=List[STMGroceryItemResponse])
async def get_random_items(
    db: Database,
    user_id: CurrentUserId,
    count: int = 5
):
    """Get random grocery items for a trial."""
    # Use Supabase RPC to get random items
    try:
        result = await db.rpc("get_random_grocery_items", {"p_count": count})
        return result if result else []
    except Exception:
        # Fallback: query all and let frontend shuffle
        items = await db.query("stm_grocery_items", filters={}, limit=count)
        return items


@router.post("/sessions", response_model=STMSessionResponse)
async def create_session(
    session_data: STMSessionCreate,
    user_id: CurrentUserId,
    db: Database
):
    """Create a new short-term memory session."""
    result = await db.insert(
        "stm_sessions",
        {
            "user_id": user_id,
            "list_length": session_data.list_length,
            "total_correct": 0,
            "total_trials": 0,
        }
    )
    # insert returns a list, get first item (handle both list and dict for tests)
    if isinstance(result, list):
        return result[0] if result else result
    return result


@router.get("/sessions", response_model=STMSessionListResponse)
async def get_sessions(
    user_id: CurrentUserId,
    db: Database,
    limit: int = 20
):
    """Get user's recent sessions and progress."""
    # Get sessions
    sessions = await db.query(
        "stm_sessions",
        filters={"user_id": user_id},
        order_by="started_at",
        order_desc=True,
        limit=limit
    )

    # Calculate progress
    total_sessions = len([s for s in sessions if s.get("completed_at")])
    total_trials = sum(s.get("total_trials", 0) for s in sessions)
    total_correct = sum(s.get("total_correct", 0) for s in sessions)
    total_possible = sum(
        s.get("total_trials", 0) * s.get("list_length", 0)
        for s in sessions
    )
    average_accuracy = (
        (total_correct / total_possible * 100) if total_possible > 0 else 0
    )
    max_list_length = max(
        (s.get("list_length", 0) for s in sessions if s.get("completed_at")),
        default=0
    )

    progress = STMProgressResponse(
        total_sessions=total_sessions,
        total_trials=total_trials,
        total_items_correct=total_correct,
        average_accuracy=round(average_accuracy, 1),
        max_list_length=max_list_length
    )

    return STMSessionListResponse(
        sessions=sessions,
        progress=progress
    )


@router.get("/sessions/{session_id}", response_model=STMSessionResponse)
async def get_session(
    session_id: str,
    user_id: CurrentUserId,
    db: Database
):
    """Get a specific session."""
    sessions = await db.query(
        "stm_sessions",
        filters={"id": session_id, "user_id": user_id},
        limit=1
    )

    if not sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    return sessions[0]


@router.post("/sessions/{session_id}/trials", response_model=STMTrialResponse)
async def create_trial(
    session_id: str,
    user_id: CurrentUserId,
    db: Database,
    trial_number: int = 1
):
    """Create a new trial within a session."""
    # Verify session ownership
    sessions = await db.query(
        "stm_sessions",
        filters={"id": session_id, "user_id": user_id},
        limit=1
    )

    if not sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[0]

    # Get random items for this trial
    try:
        items = await db.rpc(
            "get_random_grocery_items",
            {"p_count": session["list_length"]}
        )
    except Exception:
        items = await db.query(
            "stm_grocery_items",
            filters={},
            limit=session["list_length"]
        )

    # Create trial
    trial_result = await db.insert(
        "stm_session_trials",
        {
            "session_id": session_id,
            "trial_number": trial_number,
            "list_length": session["list_length"],
            "items_correct": 0,
            "is_fully_correct": False,
        }
    )
    # Handle both list and dict returns
    if isinstance(trial_result, list):
        trial = trial_result[0] if trial_result else trial_result
    else:
        trial = trial_result

    # Create trial items
    for i, item in enumerate(items):
        await db.insert(
            "stm_trial_items",
            {
                "trial_id": trial["id"],
                "item_id": item["id"],
                "item_name": item["name"],
                "position": i + 1,
            }
        )

    # Return trial with items
    trial["items"] = items

    return trial


@router.get("/trials/{trial_id}", response_model=STMTrialResponse)
async def get_trial(
    trial_id: str,
    user_id: CurrentUserId,
    db: Database
):
    """Get a specific trial with its items."""
    # Get trial
    trials = await db.query(
        "stm_session_trials",
        filters={"id": trial_id},
        limit=1
    )

    if not trials:
        raise HTTPException(status_code=404, detail="Trial not found")

    trial = trials[0]

    # Verify session ownership
    sessions = await db.query(
        "stm_sessions",
        filters={"id": trial["session_id"], "user_id": user_id},
        limit=1
    )

    if not sessions:
        raise HTTPException(status_code=404, detail="Trial not found")

    # Get trial items
    items = await db.query(
        "stm_trial_items",
        filters={"trial_id": trial_id},
        order_by="position"
    )

    trial["items"] = [
        {"id": item["item_id"], "name": item["item_name"], "category": ""}
        for item in items
    ]

    return trial


@router.post("/trials/{trial_id}/complete", response_model=STMTrialResponse)
async def complete_trial(
    trial_id: str,
    request: STMCompleteTrialRequest,
    user_id: CurrentUserId,
    db: Database
):
    """Complete a trial with recall attempts."""
    # Get trial
    trials = await db.query(
        "stm_session_trials",
        filters={"id": trial_id},
        limit=1
    )

    if not trials:
        raise HTTPException(status_code=404, detail="Trial not found")

    trial = trials[0]

    # Verify session ownership
    sessions = await db.query(
        "stm_sessions",
        filters={"id": trial["session_id"], "user_id": user_id},
        limit=1
    )

    if not sessions:
        raise HTTPException(status_code=404, detail="Trial not found")

    session = sessions[0]

    # Get trial items for matching
    trial_items = await db.query(
        "stm_trial_items",
        filters={"trial_id": trial_id},
        order_by="position"
    )

    # Save recall attempts
    items_correct = 0
    for attempt in request.recall_attempts:
        # Find matching trial item (case-insensitive)
        target_item = next(
            (ti for ti in trial_items if ti["item_name"].lower() == attempt.target_item_name.lower()),
            None
        )

        await db.insert(
            "stm_recall_attempts",
            {
                "trial_id": trial_id,
                "target_item_id": target_item["id"] if target_item else None,
                "target_item_name": attempt.target_item_name,
                "spoken_item": attempt.spoken_item,
                "match_confidence": attempt.match_confidence,
                "is_correct": attempt.is_correct,
                "is_partial": attempt.is_partial,
                "time_to_recall": attempt.time_to_recall,
            }
        )

        if attempt.is_correct:
            items_correct += 1

    is_fully_correct = items_correct == trial["list_length"]

    # Update trial
    await db.update(
        "stm_session_trials",
        filters={"id": trial_id},
        data={
            "completed_at": datetime.utcnow().isoformat(),
            "items_correct": items_correct,
            "is_fully_correct": is_fully_correct,
        }
    )

    # Update session totals
    await db.update(
        "stm_sessions",
        filters={"id": trial["session_id"]},
        data={
            "total_correct": session["total_correct"] + items_correct,
            "total_trials": session["total_trials"] + 1,
        }
    )

    # Fetch the updated trial to return complete data
    updated_trials = await db.query(
        "stm_session_trials",
        filters={"id": trial_id},
        limit=1
    )
    return updated_trials[0] if updated_trials else trial


@router.post("/sessions/{session_id}/complete", response_model=STMSessionResponse)
async def complete_session(
    session_id: str,
    user_id: CurrentUserId,
    db: Database
):
    """Complete a session."""
    # Verify session ownership
    sessions = await db.query(
        "stm_sessions",
        filters={"id": session_id, "user_id": user_id},
        limit=1
    )

    if not sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update session
    updated = await db.update(
        "stm_sessions",
        filters={"id": session_id},
        data={"completed_at": datetime.utcnow().isoformat()}
    )

    # Handle both list and dict return types
    if isinstance(updated, list):
        return updated[0] if updated else sessions[0]
    return updated


@router.get("/progress", response_model=STMProgressResponse)
async def get_progress(
    user_id: CurrentUserId,
    db: Database
):
    """Get user's overall STM progress."""
    # Try to use the RPC function
    try:
        result = await db.rpc("get_stm_progress", {"p_user_id": user_id})
        if result and len(result) > 0:
            row = result[0]
            return STMProgressResponse(
                total_sessions=row.get("total_sessions", 0),
                total_trials=row.get("total_trials", 0),
                total_items_correct=row.get("total_items_correct", 0),
                average_accuracy=float(row.get("average_accuracy", 0)),
                max_list_length=row.get("max_list_length", 0)
            )
    except Exception:
        pass

    # Fallback: calculate from sessions
    sessions = await db.query(
        "stm_sessions",
        filters={"user_id": user_id}
    )

    completed = [s for s in sessions if s.get("completed_at")]
    total_trials = sum(s.get("total_trials", 0) for s in completed)
    total_correct = sum(s.get("total_correct", 0) for s in completed)
    total_possible = sum(
        s.get("total_trials", 0) * s.get("list_length", 0)
        for s in completed
    )
    average_accuracy = (
        (total_correct / total_possible * 100) if total_possible > 0 else 0
    )
    max_list_length = max(
        (s.get("list_length", 0) for s in completed),
        default=0
    )

    return STMProgressResponse(
        total_sessions=len(completed),
        total_trials=total_trials,
        total_items_correct=total_correct,
        average_accuracy=round(average_accuracy, 1),
        max_list_length=max_list_length
    )
