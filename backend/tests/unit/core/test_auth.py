"""Unit tests for authentication module."""
import pytest
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_verify_token_success(mocker):
    """Test successful token verification."""
    from app.core.auth import verify_token

    # Mock the JWT secret
    mocker.patch("app.core.auth.get_supabase_jwt_secret", return_value="test-secret")

    # Create a valid token
    payload = {
        "sub": "user-123",
        "email": "test@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(payload, "test-secret", algorithm="HS256")

    # Verify token
    result = await verify_token(token)

    assert result["sub"] == "user-123"
    assert result["email"] == "test@example.com"
    assert result["role"] == "authenticated"


@pytest.mark.asyncio
async def test_verify_token_expired(mocker):
    """Test token verification with expired token."""
    from app.core.auth import verify_token

    mocker.patch("app.core.auth.get_supabase_jwt_secret", return_value="test-secret")

    # Create an expired token
    payload = {
        "sub": "user-123",
        "email": "test@example.com",
        "aud": "authenticated",
        "exp": datetime.utcnow() - timedelta(hours=1)
    }
    token = jwt.encode(payload, "test-secret", algorithm="HS256")

    # Verify token should raise exception
    with pytest.raises(HTTPException) as exc_info:
        await verify_token(token)

    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_verify_token_invalid(mocker):
    """Test token verification with invalid token."""
    from app.core.auth import verify_token

    mocker.patch("app.core.auth.get_supabase_jwt_secret", return_value="test-secret")

    # Invalid token
    token = "invalid.token.here"

    with pytest.raises(HTTPException) as exc_info:
        await verify_token(token)

    assert exc_info.value.status_code == 401
    assert "invalid" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_get_current_user_success(mocker):
    """Test getting current user from token."""
    from app.core.auth import get_current_user

    # Mock verify_token
    mock_payload = {
        "sub": "user-123",
        "email": "test@example.com",
        "role": "authenticated"
    }
    mocker.patch("app.core.auth.verify_token", return_value=mock_payload)

    # Create mock credentials
    mock_credentials = mocker.Mock()
    mock_credentials.credentials = "mock-token"

    # Get current user
    user = await get_current_user(mock_credentials)

    assert user["id"] == "user-123"
    assert user["email"] == "test@example.com"
    assert user["role"] == "authenticated"


@pytest.mark.asyncio
async def test_get_current_user_no_id(mocker):
    """Test getting current user with missing user ID."""
    from app.core.auth import get_current_user

    # Mock verify_token with no sub
    mock_payload = {
        "email": "test@example.com",
        "role": "authenticated"
    }
    mocker.patch("app.core.auth.verify_token", return_value=mock_payload)

    mock_credentials = mocker.Mock()
    mock_credentials.credentials = "mock-token"

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(mock_credentials)

    assert exc_info.value.status_code == 401
    assert "invalid user id" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_get_current_user_id_success(mocker):
    """Test getting current user ID from token."""
    from app.core.auth import get_current_user_id

    # Mock get_current_user
    mock_user = {
        "id": "user-123",
        "email": "test@example.com",
        "role": "authenticated"
    }
    mocker.patch("app.core.auth.get_current_user", return_value=mock_user)

    mock_credentials = mocker.Mock()
    mock_credentials.credentials = "mock-token"

    user_id = await get_current_user_id(mock_credentials)

    assert user_id == "user-123"
