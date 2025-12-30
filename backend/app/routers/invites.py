"""Contact invite endpoints for Life Words treatment."""
import secrets
import traceback
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File
from app.core.dependencies import CurrentUserId, Database
from app.core.database import db as global_db
from app.models.schemas import (
    ContactInviteCreate,
    ContactInviteResponse,
    InviteVerifyResponse,
    InviteSubmitRequest,
    InviteSubmitResponse,
)
from app.services.email_service import send_invite_email, send_thank_you_email
from app.config import settings
import httpx

router = APIRouter()

# Frontend URL for invite links
FRONTEND_URL = settings.cors_origins[0] if settings.cors_origins else "http://localhost:3000"


def generate_secure_token() -> str:
    """Generate a secure random token for invite links."""
    return secrets.token_urlsafe(32)


# ============== Authenticated Endpoints ==============

@router.post("/invites")
async def create_invite(
    invite_data: ContactInviteCreate,
    user_id: CurrentUserId,
    db: Database
) -> ContactInviteResponse:
    """Create and send an invite to a contact."""
    try:
        # Get the user's profile to get their name
        profiles = await db.query(
            "profiles",
            select="full_name",
            filters={"id": user_id}
        )

        if not profiles or not profiles[0].get("full_name"):
            raise HTTPException(
                status_code=400,
                detail="Please set your name in your profile before sending invites"
            )

        inviter_name = profiles[0]["full_name"]

        # Generate secure token
        token = generate_secure_token()

        # Create invite URL
        invite_url = f"{FRONTEND_URL}/invite/{token}"

        # Insert invite record
        invite = await db.insert(
            "contact_invites",
            {
                "user_id": user_id,
                "recipient_email": invite_data.recipient_email,
                "recipient_name": invite_data.recipient_name,
                "token": token,
                "custom_message": invite_data.custom_message,
                "status": "pending"
            }
        )

        # Send invite email
        email_sent = await send_invite_email(
            recipient_email=invite_data.recipient_email,
            recipient_name=invite_data.recipient_name,
            inviter_full_name=inviter_name,
            invite_url=invite_url,
            custom_message=invite_data.custom_message
        )

        if not email_sent:
            # Delete the invite if email failed
            await db.delete("contact_invites", {"id": invite[0]["id"]})
            raise HTTPException(
                status_code=500,
                detail="Failed to send invite email. Please try again."
            )

        return ContactInviteResponse(**invite[0])

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invites")
async def list_invites(
    user_id: CurrentUserId,
    db: Database
) -> List[ContactInviteResponse]:
    """List all invites sent by the current user."""
    try:
        invites = await db.query(
            "contact_invites",
            select="*",
            filters={"user_id": user_id},
            order="created_at.desc"
        )

        return [ContactInviteResponse(**inv) for inv in invites] if invites else []

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/invites/{invite_id}")
async def cancel_invite(
    invite_id: str,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Cancel a pending invite."""
    try:
        # Verify ownership and status
        invites = await db.query(
            "contact_invites",
            select="*",
            filters={"id": invite_id, "user_id": user_id}
        )

        if not invites:
            raise HTTPException(status_code=404, detail="Invite not found")

        invite = invites[0]
        if invite["status"] != "pending":
            raise HTTPException(
                status_code=400,
                detail="Only pending invites can be cancelled"
            )

        # Delete the invite
        await db.delete("contact_invites", {"id": invite_id})

        return {"success": True, "message": "Invite cancelled"}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============== Public Endpoints (no auth required) ==============

@router.get("/invites/verify/{token}")
async def verify_invite(token: str) -> InviteVerifyResponse:
    """Verify an invite token and return its status (public endpoint)."""
    try:
        # Query invite by token using service role (bypasses RLS)
        url = f"{settings.supabase_url}/rest/v1/contact_invites"
        headers = {
            "apikey": settings.supabase_secret_key,
            "Authorization": f"Bearer {settings.supabase_secret_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=headers,
                params={"token": f"eq.{token}", "select": "*"}
            )
            response.raise_for_status()
            invites = response.json()

        if not invites:
            return InviteVerifyResponse(
                valid=False,
                status="not_found"
            )

        invite = invites[0]

        # Check if expired
        expires_at = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
        if expires_at < datetime.now(timezone.utc):
            return InviteVerifyResponse(
                valid=False,
                status="expired"
            )

        # Check if already completed
        if invite["status"] == "completed":
            # Get contact name if available
            contact_name = None
            if invite.get("contact_id"):
                contacts_response = await client.get(
                    f"{settings.supabase_url}/rest/v1/personal_contacts",
                    headers=headers,
                    params={"id": f"eq.{invite['contact_id']}", "select": "name"}
                )
                contacts = contacts_response.json()
                if contacts:
                    contact_name = contacts[0]["name"]

            return InviteVerifyResponse(
                valid=False,
                status="completed",
                contact_name=contact_name
            )

        # Get inviter's name
        async with httpx.AsyncClient() as profile_client:
            profiles_response = await profile_client.get(
                f"{settings.supabase_url}/rest/v1/profiles",
                headers=headers,
                params={"id": f"eq.{invite['user_id']}", "select": "full_name"}
            )
        profiles = profiles_response.json()
        inviter_name = profiles[0]["full_name"] if profiles else None

        return InviteVerifyResponse(
            valid=True,
            status="pending",
            inviter_name=inviter_name,
            recipient_name=invite["recipient_name"]
        )

    except Exception as e:
        traceback.print_exc()
        return InviteVerifyResponse(
            valid=False,
            status="not_found"
        )


@router.post("/invites/submit/{token}")
async def submit_invite(
    token: str,
    contact_data: InviteSubmitRequest
) -> InviteSubmitResponse:
    """Submit contact information from an invite (public endpoint)."""
    try:
        headers = {
            "apikey": settings.supabase_secret_key,
            "Authorization": f"Bearer {settings.supabase_secret_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        async with httpx.AsyncClient() as client:
            # Get invite
            response = await client.get(
                f"{settings.supabase_url}/rest/v1/contact_invites",
                headers=headers,
                params={"token": f"eq.{token}", "select": "*"}
            )
            invites = response.json()

            if not invites:
                raise HTTPException(status_code=404, detail="Invite not found")

            invite = invites[0]

            # Check if expired
            expires_at = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
            if expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="This invite has expired")

            # Check if already completed
            if invite["status"] == "completed":
                raise HTTPException(
                    status_code=400,
                    detail="This invite has already been used"
                )

            # Helper to convert empty strings to None
            def empty_to_none(val):
                return None if val == "" else val

            # Create the contact for the user
            contact_payload = {
                "user_id": invite["user_id"],
                "name": contact_data.name,
                "nickname": empty_to_none(contact_data.nickname),
                "relationship": contact_data.relationship,
                "photo_url": contact_data.photo_url,
                "category": empty_to_none(contact_data.category),
                "description": empty_to_none(contact_data.description),
                "association": empty_to_none(contact_data.association),
                "location_context": empty_to_none(contact_data.location_context),
                "interests": empty_to_none(contact_data.interests),
                "personality": empty_to_none(contact_data.personality),
                "values": empty_to_none(contact_data.values),
                "social_behavior": empty_to_none(contact_data.social_behavior)
            }

            contact_response = await client.post(
                f"{settings.supabase_url}/rest/v1/personal_contacts",
                headers=headers,
                json=contact_payload
            )
            contact_response.raise_for_status()
            contact = contact_response.json()
            contact_id = contact[0]["id"] if isinstance(contact, list) else contact["id"]

            # Update invite status
            await client.patch(
                f"{settings.supabase_url}/rest/v1/contact_invites",
                headers=headers,
                params={"id": f"eq.{invite['id']}"},
                json={
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "contact_id": contact_id
                }
            )

            # Get inviter's name for thank you email
            profiles_response = await client.get(
                f"{settings.supabase_url}/rest/v1/profiles",
                headers=headers,
                params={"id": f"eq.{invite['user_id']}", "select": "full_name"}
            )
            profiles = profiles_response.json()
            inviter_name = profiles[0]["full_name"] if profiles else "the user"

            # Send thank you email
            await send_thank_you_email(
                recipient_email=invite["recipient_email"],
                recipient_name=contact_data.name,
                inviter_full_name=inviter_name
            )

            return InviteSubmitResponse(
                success=True,
                message="Thank you! Your information has been added.",
                contact_name=contact_data.name
            )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invites/upload-photo")
async def upload_invite_photo(
    file: UploadFile = File(...)
) -> Dict[str, str]:
    """Upload a photo for an invite submission (public endpoint).

    This endpoint allows unauthenticated users to upload photos for invite forms.
    Photos are stored in a separate 'invite-uploads' folder.
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read file content
        content = await file.read()

        # Limit file size (5MB)
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")

        # Generate unique filename in invite-uploads subfolder
        file_ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
        filename = f"invite-uploads/{secrets.token_urlsafe(16)}.{file_ext}"

        # Upload to Supabase Storage (user-uploads bucket)
        headers = {
            "apikey": settings.supabase_secret_key,
            "Authorization": f"Bearer {settings.supabase_secret_key}",
            "Content-Type": file.content_type or "image/jpeg"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.supabase_url}/storage/v1/object/user-uploads/{filename}",
                headers=headers,
                content=content
            )

            if response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to upload photo: {response.text}"
                )

        # Return public URL
        photo_url = f"{settings.supabase_url}/storage/v1/object/public/user-uploads/{filename}"

        return {"photo_url": photo_url}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
