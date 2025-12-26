"""Unit tests for authentication module."""
import pytest
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_verify_token_success(mocker):
    """Test successful token verification."""
    from app.core.auth import verify_token

    # Mock httpx client response
    mock_response = mocker.Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "id": "user-123",
        "email": "test@example.com",
        "role": "authenticated"
    }

    mock_client = mocker.AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    mocker.patch("httpx.AsyncClient", return_value=mock_client)

    # Verify token
    result = await verify_token("test-token")

    assert result["sub"] == "user-123"
    assert result["email"] == "test@example.com"
    assert result["role"] == "authenticated"


@pytest.mark.asyncio
async def test_verify_token_expired(mocker):
    """Test token verification with expired token."""
    from app.core.auth import verify_token

    # Mock httpx client response for expired token
    mock_response = mocker.Mock()
    mock_response.status_code = 401
    mock_response.text = "Token expired"

    mock_client = mocker.AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    mocker.patch("httpx.AsyncClient", return_value=mock_client)

    # Verify token should raise exception
    with pytest.raises(HTTPException) as exc_info:
        await verify_token("expired-token")

    assert exc_info.value.status_code == 401
    assert "verification failed" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_verify_token_invalid(mocker):
    """Test token verification with invalid token."""
    from app.core.auth import verify_token

    # Mock httpx client to raise an error for invalid token
    mock_client = mocker.AsyncMock()
    mock_client.get.side_effect = Exception("Invalid token format")
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    mocker.patch("httpx.AsyncClient", return_value=mock_client)

    # Invalid token
    with pytest.raises(HTTPException) as exc_info:
        await verify_token("invalid.token.here")

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
