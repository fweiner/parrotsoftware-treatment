"""Personal Items (My Stuff) endpoints for Life Words."""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.core.dependencies import CurrentUserId, Database
from app.models.schemas import (
    PersonalItemCreate,
    PersonalItemUpdate,
    PersonalItemResponse,
    QuickAddItemCreate,
)
import traceback

router = APIRouter()


@router.post("")
async def create_personal_item(
    item_data: PersonalItemCreate,
    user_id: CurrentUserId,
    db: Database
) -> PersonalItemResponse:
    """Create a new personal item."""
    try:
        # Helper to convert empty strings to None
        def empty_to_none(val):
            return None if val == "" else val

        item = await db.insert(
            "personal_items",
            {
                "user_id": user_id,
                "name": item_data.name,
                "pronunciation": empty_to_none(item_data.pronunciation),
                "photo_url": item_data.photo_url,
                "purpose": empty_to_none(item_data.purpose),
                "features": empty_to_none(item_data.features),
                "category": empty_to_none(item_data.category),
                "size": empty_to_none(item_data.size),
                "shape": empty_to_none(item_data.shape),
                "color": empty_to_none(item_data.color),
                "weight": empty_to_none(item_data.weight),
                "location": empty_to_none(item_data.location),
                "associated_with": empty_to_none(item_data.associated_with),
            }
        )

        return PersonalItemResponse(**item[0])

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quick-add")
async def quick_add_item(
    data: QuickAddItemCreate,
    user_id: CurrentUserId,
    db: Database
) -> PersonalItemResponse:
    """Quick add an item with just a photo - creates an incomplete draft entry."""
    try:
        # Create item with empty name (triggers is_complete = FALSE)
        item = await db.insert(
            "personal_items",
            {
                "user_id": user_id,
                "name": "",  # Empty triggers is_complete = FALSE
                "photo_url": data.photo_url,
            }
        )

        return PersonalItemResponse(**item[0])

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def list_personal_items(
    user_id: CurrentUserId,
    db: Database,
    include_inactive: bool = False
) -> List[PersonalItemResponse]:
    """List user's personal items."""
    try:
        filters = {"user_id": user_id}
        if not include_inactive:
            filters["is_active"] = True

        items = await db.query(
            "personal_items",
            select="*",
            filters=filters,
            order="created_at.desc"
        )

        return [PersonalItemResponse(**i) for i in items] if items else []

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{item_id}")
async def get_personal_item(
    item_id: str,
    user_id: CurrentUserId,
    db: Database
) -> PersonalItemResponse:
    """Get a specific personal item."""
    try:
        items = await db.query(
            "personal_items",
            select="*",
            filters={"id": item_id, "user_id": user_id}
        )

        if not items:
            raise HTTPException(status_code=404, detail="Item not found")

        return PersonalItemResponse(**items[0])

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{item_id}")
async def update_personal_item(
    item_id: str,
    item_data: PersonalItemUpdate,
    user_id: CurrentUserId,
    db: Database
) -> PersonalItemResponse:
    """Update a personal item."""
    try:
        # Verify ownership
        existing = await db.query(
            "personal_items",
            select="id",
            filters={"id": item_id, "user_id": user_id}
        )

        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")

        # Build update data (only non-None fields, convert empty strings to None)
        update_data = {}
        for k, v in item_data.model_dump().items():
            if v is not None:
                update_data[k] = None if v == "" else v

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        updated = await db.update(
            "personal_items",
            {"id": item_id},
            update_data
        )

        # Handle both list (from test mocks) and dict (from actual db.update)
        updated_data = updated[0] if isinstance(updated, list) else updated
        return PersonalItemResponse(**updated_data)

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{item_id}")
async def delete_personal_item(
    item_id: str,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Soft delete a personal item (set is_active=false)."""
    try:
        # Verify ownership
        existing = await db.query(
            "personal_items",
            select="id",
            filters={"id": item_id, "user_id": user_id}
        )

        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")

        # Soft delete
        await db.update(
            "personal_items",
            {"id": item_id},
            {"is_active": False}
        )

        return {"success": True, "message": "Item deactivated"}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
