"""Authentication utilities for JWT verification."""
import jwt
import httpx
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings


security = HTTPBearer()


async def get_supabase_jwt_secret() -> str:
    """Get Supabase JWT secret from their API."""
    # For now, use the service key directly
    # In production, you'd fetch the JWT secret from Supabase
    return settings.supabase_secret_key


async def verify_token(token: str) -> Dict[str, Any]:
    """Verify Supabase JWT token."""
    try:
        # Supabase uses the service key as the JWT secret
        secret = await get_supabase_jwt_secret()

        # Decode and verify the JWT
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_exp": True}
        )

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Dict[str, Any]:
    """Get current user from JWT token."""
    token = credentials.credentials
    payload = await verify_token(token)

    # Extract user info from JWT payload
    user = {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
    }

    if not user["id"]:
        raise HTTPException(status_code=401, detail="Invalid user ID in token")

    return user


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    """Get current user ID from JWT token."""
    user = await get_current_user(credentials)
    return user["id"]
