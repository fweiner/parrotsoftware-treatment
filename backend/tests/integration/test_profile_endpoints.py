"""Integration tests for profile endpoints."""
import pytest
from datetime import datetime, timezone


# Sample test data
SAMPLE_USER_ID = "test-user-123"
SAMPLE_PROFILE = {
    "id": SAMPLE_USER_ID,
    "email": "test@example.com",
    "full_name": "John Doe",
    "date_of_birth": "1980-01-15",
    "created_at": datetime.now(timezone.utc).isoformat(),
    "updated_at": datetime.now(timezone.utc).isoformat()
}


def test_get_profile_unauthorized(client):
    """Test that getting profile requires authentication."""
    response = client.get("/api/profile")
    assert response.status_code == 401


def test_get_profile_success(app, client, mock_user_id, mock_db):
    """Test successfully getting profile."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [SAMPLE_PROFILE]

    response = client.get(
        "/api/profile",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "John Doe"
    assert data["email"] == "test@example.com"


def test_get_profile_not_found(app, client, mock_user_id, mock_db):
    """Test getting profile when it doesn't exist."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = []

    response = client.get(
        "/api/profile",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 404


def test_update_profile_unauthorized(client):
    """Test that updating profile requires authentication."""
    response = client.patch(
        "/api/profile",
        json={"full_name": "Jane Doe"}
    )
    assert response.status_code == 401


def test_update_profile_success(app, client, mock_user_id, mock_db):
    """Test successfully updating profile."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [SAMPLE_PROFILE]
    updated_profile = {**SAMPLE_PROFILE, "full_name": "Jane Doe"}
    mock_db.update.return_value = updated_profile

    response = client.patch(
        "/api/profile",
        json={"full_name": "Jane Doe"},
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Jane Doe"


def test_update_profile_not_found(app, client, mock_user_id, mock_db):
    """Test updating profile when it doesn't exist."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = []

    response = client.patch(
        "/api/profile",
        json={"full_name": "Jane Doe"},
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 404


def test_update_profile_no_changes(app, client, mock_user_id, mock_db):
    """Test updating profile with no changes."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [SAMPLE_PROFILE]

    response = client.patch(
        "/api/profile",
        json={},
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
    data = response.json()
    # Should return current profile unchanged
    assert data["full_name"] == "John Doe"


def test_update_profile_with_date_of_birth(app, client, mock_user_id, mock_db):
    """Test updating profile with date of birth."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [SAMPLE_PROFILE]
    updated_profile = {**SAMPLE_PROFILE, "date_of_birth": "1985-06-20"}
    mock_db.update.return_value = updated_profile

    response = client.patch(
        "/api/profile",
        json={"date_of_birth": "1985-06-20"},
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["date_of_birth"] == "1985-06-20"
