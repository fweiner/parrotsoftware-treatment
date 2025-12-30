"""Profile management endpoints."""
from fastapi import APIRouter, HTTPException
from app.core.dependencies import CurrentUserId, Database
from app.models.schemas import ProfileUpdate, ProfileResponse


router = APIRouter()


@router.get("", response_model=ProfileResponse)
async def get_profile(
    user_id: CurrentUserId,
    db: Database
):
    """Get current user's profile."""
    profiles = await db.query(
        "profiles",
        filters={"id": user_id}
    )

    if not profiles:
        raise HTTPException(status_code=404, detail="Profile not found")

    return profiles[0]


@router.patch("", response_model=ProfileResponse)
async def update_profile(
    user_id: CurrentUserId,
    db: Database,
    profile_data: ProfileUpdate
):
    """Update current user's profile."""
    # Get current profile first
    profiles = await db.query(
        "profiles",
        filters={"id": user_id}
    )

    if not profiles:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Build update data (only include non-None values)
    update_data = {}
    if profile_data.full_name is not None:
        update_data["full_name"] = profile_data.full_name
    if profile_data.date_of_birth is not None:
        update_data["date_of_birth"] = profile_data.date_of_birth.isoformat()

    if not update_data:
        # No changes, return current profile
        return profiles[0]

    # Update profile
    updated = await db.update(
        "profiles",
        filters={"id": user_id},
        data=update_data
    )

    return updated
