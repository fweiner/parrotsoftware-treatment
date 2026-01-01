"""Integration tests for Short-Term Memory endpoints."""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock


SAMPLE_USER_ID = "user-123"
SAMPLE_SESSION_ID = "session-123"
SAMPLE_TRIAL_ID = "trial-123"

SAMPLE_GROCERY_ITEMS = [
    {"id": "item-1", "name": "apples", "category": "produce"},
    {"id": "item-2", "name": "milk", "category": "dairy"},
    {"id": "item-3", "name": "bread", "category": "pantry"},
]

SAMPLE_SESSION = {
    "id": SAMPLE_SESSION_ID,
    "user_id": SAMPLE_USER_ID,
    "list_length": 3,
    "total_correct": 0,
    "total_trials": 0,
    "started_at": "2026-01-01T12:00:00Z",
    "completed_at": None,
}

SAMPLE_TRIAL = {
    "id": SAMPLE_TRIAL_ID,
    "session_id": SAMPLE_SESSION_ID,
    "trial_number": 1,
    "list_length": 3,
    "items_correct": 0,
    "is_fully_correct": False,
    "started_at": "2026-01-01T12:00:00Z",
    "completed_at": None,
}

SAMPLE_TRIAL_ITEMS = [
    {"id": "ti-1", "trial_id": SAMPLE_TRIAL_ID, "item_id": "item-1", "item_name": "apples", "position": 1},
    {"id": "ti-2", "trial_id": SAMPLE_TRIAL_ID, "item_id": "item-2", "item_name": "milk", "position": 2},
    {"id": "ti-3", "trial_id": SAMPLE_TRIAL_ID, "item_id": "item-3", "item_name": "bread", "position": 3},
]


def test_get_grocery_items_unauthorized(client):
    """Test that getting grocery items requires authentication."""
    response = client.get("/api/short-term-memory/grocery-items")
    assert response.status_code == 401


def test_get_grocery_items_success(app, client, mock_user_id, mock_db):
    """Test successfully getting grocery items."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = SAMPLE_GROCERY_ITEMS

    response = client.get(
        "/api/short-term-memory/grocery-items",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert data[0]["name"] == "apples"


def test_get_random_items_success(app, client, mock_user_id, mock_db):
    """Test getting random grocery items."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.rpc.return_value = SAMPLE_GROCERY_ITEMS

    response = client.get(
        "/api/short-term-memory/random-items?count=3",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3


def test_get_random_items_fallback(app, client, mock_user_id, mock_db):
    """Test fallback when RPC fails."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.rpc.side_effect = Exception("RPC failed")
    mock_db.query.return_value = SAMPLE_GROCERY_ITEMS

    response = client.get(
        "/api/short-term-memory/random-items?count=3",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200


def test_create_session_unauthorized(client):
    """Test that creating a session requires authentication."""
    response = client.post(
        "/api/short-term-memory/sessions",
        json={"list_length": 3}
    )
    assert response.status_code == 401


def test_create_session_success(app, client, mock_user_id, mock_db):
    """Test successfully creating a session."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.insert.return_value = SAMPLE_SESSION

    response = client.post(
        "/api/short-term-memory/sessions",
        json={"list_length": 3},
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["list_length"] == 3


def test_get_sessions_success(app, client, mock_user_id, mock_db):
    """Test getting user sessions with progress."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [SAMPLE_SESSION]

    response = client.get(
        "/api/short-term-memory/sessions",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "sessions" in data
    assert "progress" in data


def test_get_session_success(app, client, mock_user_id, mock_db):
    """Test getting a specific session."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [SAMPLE_SESSION]

    response = client.get(
        f"/api/short-term-memory/sessions/{SAMPLE_SESSION_ID}",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == SAMPLE_SESSION_ID


def test_get_session_not_found(app, client, mock_user_id, mock_db):
    """Test getting a non-existent session."""
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
        "/api/short-term-memory/sessions/nonexistent",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 404


def test_create_trial_success(app, client, mock_user_id, mock_db):
    """Test creating a trial."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [SAMPLE_SESSION]
    mock_db.rpc.return_value = SAMPLE_GROCERY_ITEMS
    mock_db.insert.return_value = SAMPLE_TRIAL

    response = client.post(
        f"/api/short-term-memory/sessions/{SAMPLE_SESSION_ID}/trials?trial_number=1",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["trial_number"] == 1


def test_create_trial_session_not_found(app, client, mock_user_id, mock_db):
    """Test creating trial for non-existent session."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = []

    response = client.post(
        "/api/short-term-memory/sessions/nonexistent/trials?trial_number=1",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 404


def test_get_trial_success(app, client, mock_user_id, mock_db):
    """Test getting a trial with items."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.side_effect = [
        [SAMPLE_TRIAL],  # Get trial
        [SAMPLE_SESSION],  # Verify ownership
        SAMPLE_TRIAL_ITEMS,  # Get items
    ]

    response = client.get(
        f"/api/short-term-memory/trials/{SAMPLE_TRIAL_ID}",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == SAMPLE_TRIAL_ID


def test_get_trial_not_found(app, client, mock_user_id, mock_db):
    """Test getting non-existent trial."""
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
        "/api/short-term-memory/trials/nonexistent",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 404


def test_complete_trial_success(app, client, mock_user_id, mock_db):
    """Test completing a trial with recall attempts."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.side_effect = [
        [SAMPLE_TRIAL],  # Get trial
        [SAMPLE_SESSION],  # Verify ownership
        SAMPLE_TRIAL_ITEMS,  # Get trial items
    ]
    mock_db.insert.return_value = {"id": "attempt-1"}
    mock_db.update.return_value = {**SAMPLE_TRIAL, "items_correct": 2, "is_fully_correct": False}

    response = client.post(
        f"/api/short-term-memory/trials/{SAMPLE_TRIAL_ID}/complete",
        json={
            "recall_attempts": [
                {"trial_id": SAMPLE_TRIAL_ID, "target_item_name": "apples", "spoken_item": "apples", "is_correct": True},
                {"trial_id": SAMPLE_TRIAL_ID, "target_item_name": "milk", "spoken_item": "milk", "is_correct": True},
                {"trial_id": SAMPLE_TRIAL_ID, "target_item_name": "bread", "spoken_item": None, "is_correct": False},
            ]
        },
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200


def test_complete_session_success(app, client, mock_user_id, mock_db):
    """Test completing a session."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [SAMPLE_SESSION]
    mock_db.update.return_value = {**SAMPLE_SESSION, "completed_at": "2026-01-01T12:30:00Z"}

    response = client.post(
        f"/api/short-term-memory/sessions/{SAMPLE_SESSION_ID}/complete",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200


def test_complete_session_not_found(app, client, mock_user_id, mock_db):
    """Test completing non-existent session."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = []

    response = client.post(
        "/api/short-term-memory/sessions/nonexistent/complete",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 404


def test_get_progress_success(app, client, mock_user_id, mock_db):
    """Test getting user progress."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.rpc.return_value = [{
        "total_sessions": 5,
        "total_trials": 50,
        "total_items_correct": 120,
        "average_accuracy": 80.0,
        "max_list_length": 4,
    }]

    response = client.get(
        "/api/short-term-memory/progress",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_sessions"] == 5
    assert data["average_accuracy"] == 80.0


def test_get_progress_fallback(app, client, mock_user_id, mock_db):
    """Test progress calculation fallback when RPC fails."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.rpc.side_effect = Exception("RPC failed")
    mock_db.query.return_value = [{
        **SAMPLE_SESSION,
        "completed_at": "2026-01-01T12:30:00Z",
        "total_correct": 8,
        "total_trials": 10,
    }]

    response = client.get(
        "/api/short-term-memory/progress",
        headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
