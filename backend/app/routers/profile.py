"""Profile management endpoints."""
from fastapi import APIRouter
from app.core.dependencies import CurrentUser, Database
from app.models.schemas import ProfileUpdate, ProfileResponse


router = APIRouter()


async def get_or_create_profile(db: Database, user: dict) -> dict:
    """Get profile, creating it if it doesn't exist."""
    profiles = await db.query(
        "profiles",
        filters={"id": user["id"]}
    )

    if profiles:
        return profiles[0]

    # Profile doesn't exist, create it
    new_profile = await db.insert(
        "profiles",
        {
            "id": user["id"],
            "email": user["email"],
            "full_name": None
        }
    )
    return new_profile[0] if isinstance(new_profile, list) else new_profile


@router.get("", response_model=ProfileResponse)
async def get_profile(
    user: CurrentUser,
    db: Database
):
    """Get current user's profile."""
    profile = await get_or_create_profile(db, user)
    return profile


@router.patch("", response_model=ProfileResponse)
async def update_profile(
    user: CurrentUser,
    db: Database,
    profile_data: ProfileUpdate
):
    """Update current user's profile."""
    # Get or create profile
    profile = await get_or_create_profile(db, user)

    # Build update data (only include non-None values)
    update_data = {}
    if profile_data.full_name is not None:
        update_data["full_name"] = profile_data.full_name
    if profile_data.date_of_birth is not None:
        update_data["date_of_birth"] = profile_data.date_of_birth.isoformat()
    # Personal information fields
    if profile_data.gender is not None:
        update_data["gender"] = profile_data.gender
    if profile_data.height is not None:
        update_data["height"] = profile_data.height
    if profile_data.weight is not None:
        update_data["weight"] = profile_data.weight
    if profile_data.hair_color is not None:
        update_data["hair_color"] = profile_data.hair_color
    if profile_data.eye_color is not None:
        update_data["eye_color"] = profile_data.eye_color
    if profile_data.job is not None:
        update_data["job"] = profile_data.job
    if profile_data.phone_number is not None:
        update_data["phone_number"] = profile_data.phone_number
    if profile_data.address_city is not None:
        update_data["address_city"] = profile_data.address_city
    if profile_data.address_state is not None:
        update_data["address_state"] = profile_data.address_state
    if profile_data.address_zip is not None:
        update_data["address_zip"] = profile_data.address_zip
    if profile_data.marital_status is not None:
        update_data["marital_status"] = profile_data.marital_status
    if profile_data.number_of_children is not None:
        update_data["number_of_children"] = profile_data.number_of_children
    if profile_data.favorite_food is not None:
        update_data["favorite_food"] = profile_data.favorite_food
    if profile_data.favorite_music is not None:
        update_data["favorite_music"] = profile_data.favorite_music

    if not update_data:
        # No changes, return current profile
        return profile

    # Update profile
    updated = await db.update(
        "profiles",
        filters={"id": user["id"]},
        data=update_data
    )

    return updated
