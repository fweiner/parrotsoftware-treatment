"""Results and progress tracking endpoints."""
from fastapi import APIRouter
from typing import List, Optional
from app.core.dependencies import CurrentUserId, Database
from app.services.treatment_service import TreatmentService


router = APIRouter()


@router.get("/user/{user_id}", response_model=List[dict])
async def get_user_results(
    user_id: str,
    current_user_id: CurrentUserId,
    db: Database,
    limit: int = 50
):
    """Get all results for a user (must be the current user)."""
    # Ensure users can only access their own results
    if user_id != current_user_id:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail="You can only access your own results"
        )

    service = TreatmentService(db)
    results = await service.get_user_results(user_id, limit=limit)
    return results


@router.get("/progress/{user_id}", response_model=List[dict])
async def get_user_progress(
    user_id: str,
    current_user_id: CurrentUserId,
    db: Database,
    treatment_type: Optional[str] = None
):
    """Get aggregated progress for a user."""
    # Ensure users can only access their own progress
    if user_id != current_user_id:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail="You can only access your own progress"
        )

    service = TreatmentService(db)
    results = await service.get_user_progress(
        user_id,
        treatment_type=treatment_type
    )
    return results


@router.get("/my-results", response_model=List[dict])
async def get_my_results(
    user_id: CurrentUserId,
    db: Database,
    limit: int = 50
):
    """Get all results for the current user."""
    service = TreatmentService(db)
    results = await service.get_user_results(user_id, limit=limit)
    return results


@router.get("/my-progress", response_model=List[dict])
async def get_my_progress(
    user_id: CurrentUserId,
    db: Database,
    treatment_type: Optional[str] = None
):
    """Get progress for the current user."""
    service = TreatmentService(db)
    results = await service.get_user_progress(
        user_id,
        treatment_type=treatment_type
    )
    return results
