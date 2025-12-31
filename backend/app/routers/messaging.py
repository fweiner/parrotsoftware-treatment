"""Direct Messaging endpoints for Life Words treatment."""
import secrets
import traceback
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from app.core.dependencies import CurrentUser, CurrentUserId, Database
from app.models.schemas import (
    MessageCreate,
    MessageResponse,
    ConversationSummary,
    MessagingTokenResponse,
    MessagingTokenVerifyResponse,
    PublicMessageCreate,
)
from app.config import settings
import httpx

router = APIRouter()

# Frontend URL for messaging links
FRONTEND_URL = settings.cors_origins[0] if settings.cors_origins else "http://localhost:3000"


def generate_secure_token() -> str:
    """Generate a secure random token for messaging links."""
    return secrets.token_urlsafe(32)


# ============== Authenticated Endpoints (for user) ==============

@router.get("/conversations")
async def list_conversations(
    user_id: CurrentUserId,
    db: Database
) -> List[ConversationSummary]:
    """List all contacts with message counts and latest message preview."""
    try:
        # Get all active contacts
        contacts = await db.query(
            "personal_contacts",
            select="id, name, photo_url, relationship",
            filters={"user_id": user_id, "is_active": True}
        )

        if not contacts:
            return []

        # Get messaging tokens for this user
        tokens = await db.query(
            "contact_messaging_tokens",
            select="contact_id",
            filters={"user_id": user_id, "is_active": True}
        )
        token_contact_ids = {t["contact_id"] for t in tokens} if tokens else set()

        # Build conversation summaries
        summaries = []
        for contact in contacts:
            # Get unread count for this contact
            unread_messages = await db.query(
                "messages",
                select="id",
                filters={
                    "user_id": user_id,
                    "contact_id": contact["id"],
                    "direction": "contact_to_user",
                    "is_read": False
                }
            )
            unread_count = len(unread_messages) if unread_messages else 0

            # Get latest message for this contact
            messages = await db.query(
                "messages",
                select="text_content, created_at, direction",
                filters={"user_id": user_id, "contact_id": contact["id"]},
                order="created_at.desc",
                limit=1
            )

            last_msg = messages[0] if messages else None

            summaries.append(ConversationSummary(
                contact_id=contact["id"],
                contact_name=contact["name"],
                contact_photo_url=contact["photo_url"],
                contact_relationship=contact["relationship"],
                last_message_text=last_msg["text_content"] if last_msg else None,
                last_message_at=last_msg["created_at"] if last_msg else None,
                last_message_direction=last_msg["direction"] if last_msg else None,
                unread_count=unread_count,
                has_messaging_token=contact["id"] in token_contact_ids
            ))

        # Sort by last message time (most recent first), contacts with no messages at end
        summaries.sort(
            key=lambda x: x.last_message_at or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True
        )

        return summaries

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{contact_id}")
async def get_conversation(
    contact_id: str,
    user_id: CurrentUserId,
    db: Database,
    limit: int = 50
) -> Dict[str, Any]:
    """Get messages for a specific contact."""
    try:
        # Verify contact belongs to user
        contacts = await db.query(
            "personal_contacts",
            select="id, name, photo_url, relationship",
            filters={"id": contact_id, "user_id": user_id}
        )
        if not contacts:
            raise HTTPException(status_code=404, detail="Contact not found")

        contact = contacts[0]

        # Get messages
        messages = await db.query(
            "messages",
            select="*",
            filters={"user_id": user_id, "contact_id": contact_id},
            order="created_at.asc",
            limit=limit
        )

        return {
            "contact": contact,
            "messages": [MessageResponse(**msg) for msg in messages] if messages else []
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{contact_id}/messages")
async def send_message(
    contact_id: str,
    message_data: MessageCreate,
    user_id: CurrentUserId,
    db: Database
) -> MessageResponse:
    """Send a message to a contact (from user)."""
    try:
        # Validate at least one content type
        if not any([message_data.text_content, message_data.photo_url, message_data.voice_url]):
            raise HTTPException(status_code=400, detail="Message must have content")

        # Verify contact belongs to user
        contacts = await db.query(
            "personal_contacts",
            select="id",
            filters={"id": contact_id, "user_id": user_id}
        )
        if not contacts:
            raise HTTPException(status_code=404, detail="Contact not found")

        # Insert message
        message = await db.insert(
            "messages",
            {
                "user_id": user_id,
                "contact_id": contact_id,
                "direction": "user_to_contact",
                "text_content": message_data.text_content,
                "photo_url": message_data.photo_url,
                "voice_url": message_data.voice_url,
                "voice_duration_seconds": message_data.voice_duration_seconds,
                "is_read": True  # User's own messages are always "read"
            }
        )

        result = message[0] if isinstance(message, list) else message
        return MessageResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/conversations/{contact_id}/read")
async def mark_messages_read(
    contact_id: str,
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, Any]:
    """Mark all messages from a contact as read."""
    try:
        # Verify contact belongs to user
        contacts = await db.query(
            "personal_contacts",
            select="id",
            filters={"id": contact_id, "user_id": user_id}
        )
        if not contacts:
            raise HTTPException(status_code=404, detail="Contact not found")

        # Update unread messages from this contact
        # Need to use raw query since we need to filter by multiple conditions
        headers = {
            "apikey": settings.supabase_secret_key,
            "Authorization": f"Bearer {settings.supabase_secret_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{settings.supabase_url}/rest/v1/messages",
                headers=headers,
                params={
                    "user_id": f"eq.{user_id}",
                    "contact_id": f"eq.{contact_id}",
                    "direction": "eq.contact_to_user",
                    "is_read": "eq.false"
                },
                json={
                    "is_read": True,
                    "read_at": datetime.now(timezone.utc).isoformat()
                }
            )

        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{contact_id}/token")
async def get_or_create_messaging_token(
    contact_id: str,
    user_id: CurrentUserId,
    db: Database
) -> MessagingTokenResponse:
    """Get or create a messaging token for a contact."""
    try:
        # Verify contact belongs to user
        contacts = await db.query(
            "personal_contacts",
            select="id",
            filters={"id": contact_id, "user_id": user_id}
        )
        if not contacts:
            raise HTTPException(status_code=404, detail="Contact not found")

        # Check for existing token
        tokens = await db.query(
            "contact_messaging_tokens",
            select="*",
            filters={"contact_id": contact_id, "user_id": user_id}
        )

        if tokens:
            token_data = tokens[0]
        else:
            # Create new token
            new_token = generate_secure_token()
            token_result = await db.insert(
                "contact_messaging_tokens",
                {
                    "user_id": user_id,
                    "contact_id": contact_id,
                    "token": new_token,
                    "is_active": True
                }
            )
            token_data = token_result[0] if isinstance(token_result, list) else token_result

        return MessagingTokenResponse(
            id=token_data["id"],
            contact_id=token_data["contact_id"],
            token=token_data["token"],
            messaging_url=f"{FRONTEND_URL}/message/{token_data['token']}",
            is_active=token_data["is_active"],
            created_at=token_data["created_at"],
            last_used_at=token_data.get("last_used_at")
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{contact_id}/token/regenerate")
async def regenerate_messaging_token(
    contact_id: str,
    user_id: CurrentUserId,
    db: Database
) -> MessagingTokenResponse:
    """Regenerate the messaging token (invalidates old link)."""
    try:
        # Verify contact belongs to user
        contacts = await db.query(
            "personal_contacts",
            select="id",
            filters={"id": contact_id, "user_id": user_id}
        )
        if not contacts:
            raise HTTPException(status_code=404, detail="Contact not found")

        # Delete existing token if any
        await db.delete("contact_messaging_tokens", {"contact_id": contact_id, "user_id": user_id})

        # Create new token
        new_token = generate_secure_token()
        token_result = await db.insert(
            "contact_messaging_tokens",
            {
                "user_id": user_id,
                "contact_id": contact_id,
                "token": new_token,
                "is_active": True
            }
        )
        token_data = token_result[0] if isinstance(token_result, list) else token_result

        return MessagingTokenResponse(
            id=token_data["id"],
            contact_id=token_data["contact_id"],
            token=token_data["token"],
            messaging_url=f"{FRONTEND_URL}/message/{token_data['token']}",
            is_active=token_data["is_active"],
            created_at=token_data["created_at"],
            last_used_at=None
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unread-count")
async def get_unread_count(
    user_id: CurrentUserId,
    db: Database
) -> Dict[str, int]:
    """Get total unread message count for notification badge."""
    try:
        messages = await db.query(
            "messages",
            select="id",
            filters={
                "user_id": user_id,
                "direction": "contact_to_user",
                "is_read": False
            }
        )

        return {"count": len(messages) if messages else 0}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============== Public Endpoints (for contacts via token) ==============

@router.get("/public/verify/{token}")
async def verify_messaging_token(token: str) -> MessagingTokenVerifyResponse:
    """Verify a messaging token and return contact/user info."""
    try:
        headers = {
            "apikey": settings.supabase_secret_key,
            "Authorization": f"Bearer {settings.supabase_secret_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            # Get token record
            response = await client.get(
                f"{settings.supabase_url}/rest/v1/contact_messaging_tokens",
                headers=headers,
                params={"token": f"eq.{token}", "select": "*"}
            )
            tokens = response.json()

            if not tokens:
                return MessagingTokenVerifyResponse(
                    valid=False,
                    status="not_found"
                )

            token_data = tokens[0]

            if not token_data["is_active"]:
                return MessagingTokenVerifyResponse(
                    valid=False,
                    status="inactive"
                )

            # Get contact info
            contact_response = await client.get(
                f"{settings.supabase_url}/rest/v1/personal_contacts",
                headers=headers,
                params={"id": f"eq.{token_data['contact_id']}", "select": "name,photo_url"}
            )
            contacts = contact_response.json()
            contact = contacts[0] if contacts else {}

            # Get user's name
            profile_response = await client.get(
                f"{settings.supabase_url}/rest/v1/profiles",
                headers=headers,
                params={"id": f"eq.{token_data['user_id']}", "select": "full_name"}
            )
            profiles = profile_response.json()
            user_name = profiles[0]["full_name"] if profiles else None

            # Update last_used_at
            await client.patch(
                f"{settings.supabase_url}/rest/v1/contact_messaging_tokens",
                headers={**headers, "Prefer": "return=minimal"},
                params={"id": f"eq.{token_data['id']}"},
                json={"last_used_at": datetime.now(timezone.utc).isoformat()}
            )

            return MessagingTokenVerifyResponse(
                valid=True,
                status="active",
                user_name=user_name,
                contact_name=contact.get("name"),
                contact_photo_url=contact.get("photo_url")
            )

    except Exception as e:
        traceback.print_exc()
        return MessagingTokenVerifyResponse(valid=False, status="not_found")


@router.get("/public/{token}/messages")
async def get_public_messages(
    token: str,
    limit: int = 50
) -> Dict[str, Any]:
    """Get conversation history (public endpoint for contacts)."""
    try:
        headers = {
            "apikey": settings.supabase_secret_key,
            "Authorization": f"Bearer {settings.supabase_secret_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            # Verify token
            token_response = await client.get(
                f"{settings.supabase_url}/rest/v1/contact_messaging_tokens",
                headers=headers,
                params={"token": f"eq.{token}", "is_active": "eq.true", "select": "*"}
            )
            tokens = token_response.json()

            if not tokens:
                raise HTTPException(status_code=404, detail="Invalid or inactive messaging link")

            token_data = tokens[0]

            # Get messages
            messages_response = await client.get(
                f"{settings.supabase_url}/rest/v1/messages",
                headers=headers,
                params={
                    "user_id": f"eq.{token_data['user_id']}",
                    "contact_id": f"eq.{token_data['contact_id']}",
                    "select": "*",
                    "order": "created_at.asc",
                    "limit": str(limit)
                }
            )
            messages = messages_response.json()

            return {
                "messages": [MessageResponse(**msg) for msg in messages] if messages else []
            }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/public/{token}/messages")
async def send_public_message(
    token: str,
    message_data: PublicMessageCreate
) -> MessageResponse:
    """Send a message from contact to user (public endpoint)."""
    try:
        # Validate at least one content type
        if not any([message_data.text_content, message_data.photo_url, message_data.voice_url]):
            raise HTTPException(status_code=400, detail="Message must have content")

        headers = {
            "apikey": settings.supabase_secret_key,
            "Authorization": f"Bearer {settings.supabase_secret_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        async with httpx.AsyncClient() as client:
            # Verify token
            token_response = await client.get(
                f"{settings.supabase_url}/rest/v1/contact_messaging_tokens",
                headers=headers,
                params={"token": f"eq.{token}", "is_active": "eq.true", "select": "*"}
            )
            tokens = token_response.json()

            if not tokens:
                raise HTTPException(status_code=404, detail="Invalid or inactive messaging link")

            token_data = tokens[0]

            # Insert message
            message_payload = {
                "user_id": token_data["user_id"],
                "contact_id": token_data["contact_id"],
                "direction": "contact_to_user",
                "text_content": message_data.text_content,
                "photo_url": message_data.photo_url,
                "voice_url": message_data.voice_url,
                "voice_duration_seconds": message_data.voice_duration_seconds,
                "is_read": False
            }

            msg_response = await client.post(
                f"{settings.supabase_url}/rest/v1/messages",
                headers=headers,
                json=message_payload
            )
            msg_response.raise_for_status()
            message = msg_response.json()[0]

            return MessageResponse(**message)

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/public/upload-media")
async def upload_public_media(
    file: UploadFile = File(...),
    media_type: str = "photo"
) -> Dict[str, str]:
    """Upload photo or voice message (public endpoint)."""
    try:
        # Validate media type
        if media_type == "photo":
            if not file.content_type or not file.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="File must be an image")
            max_size = 5 * 1024 * 1024  # 5MB
            folder = "message-photos"
        elif media_type == "voice":
            allowed_types = ["audio/webm", "audio/mp3", "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"]
            if not file.content_type or file.content_type not in allowed_types:
                raise HTTPException(status_code=400, detail="File must be an audio file")
            max_size = 10 * 1024 * 1024  # 10MB
            folder = "message-voice"
        else:
            raise HTTPException(status_code=400, detail="Invalid media type")

        content = await file.read()

        if len(content) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File size must be less than {max_size // (1024*1024)}MB"
            )

        # Generate filename
        ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else (
            "jpg" if media_type == "photo" else "webm"
        )
        filename = f"{folder}/{secrets.token_urlsafe(16)}.{ext}"

        # Upload to Supabase Storage
        headers = {
            "apikey": settings.supabase_secret_key,
            "Authorization": f"Bearer {settings.supabase_secret_key}",
            "Content-Type": file.content_type or "application/octet-stream"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.supabase_url}/storage/v1/object/user-uploads/{filename}",
                headers=headers,
                content=content
            )

            if response.status_code not in [200, 201]:
                raise HTTPException(status_code=500, detail=f"Upload failed: {response.text}")

        url = f"{settings.supabase_url}/storage/v1/object/public/user-uploads/{filename}"

        return {"url": url, "media_type": media_type}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# Authenticated media upload endpoint
@router.post("/upload-media")
async def upload_authenticated_media(
    user_id: CurrentUserId,
    file: UploadFile = File(...),
    media_type: str = "photo"
) -> Dict[str, str]:
    """Upload photo or voice message (authenticated endpoint)."""
    # Reuse the same logic as public upload
    return await upload_public_media(file, media_type)
