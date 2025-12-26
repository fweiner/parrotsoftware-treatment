"""Integration tests for results endpoints."""
import pytest


def test_get_user_results_unauthorized(client):
    """Test getting user results without authentication."""
    response = client.get("/api/results/user/user-123")
    assert response.status_code == 401


def test_get_user_results_success(app, client, mock_user_id, mock_db):
    """Test getting user results successfully."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    # Mock DB response
    mock_db.query.return_value = [
        {"id": "result-1", "score": 85, "details": {}},
        {"id": "result-2", "score": 90, "details": {}}
    ]

    response = client.get(
        f"/api/results/user/{mock_user_id}",
        headers={"Authorization": "Bearer valid-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["score"] == 85
    assert data[1]["score"] == 90


def test_get_user_results_forbidden_different_user(app, client, mock_user_id, mock_db):
    """Test getting results for a different user (should be forbidden)."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    # Try to access different user's results
    response = client.get(
        "/api/results/user/different-user-id",
        headers={"Authorization": "Bearer valid-token"}
    )

    assert response.status_code == 403
    data = response.json()
    assert "own results" in data["detail"].lower()


def test_get_user_results_with_limit(app, client, mock_user_id, mock_db):
    """Test getting user results with limit parameter."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [{"id": "result-1"}]

    response = client.get(
        f"/api/results/user/{mock_user_id}?limit=10",
        headers={"Authorization": "Bearer valid-token"}
    )

    assert response.status_code == 200


def test_get_user_progress_unauthorized(client):
    """Test getting user progress without authentication."""
    response = client.get("/api/results/progress/user-123")
    assert response.status_code == 401


def test_get_user_progress_success(app, client, mock_user_id, mock_db):
    """Test getting user progress successfully."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    # Mock DB response
    mock_db.query.return_value = [{
        "id": "progress-1",
        "user_id": mock_user_id,
        "treatment_type": "speech_echo",
        "total_sessions": 15,
        "average_score": 87.5
    }]

    response = client.get(
        f"/api/results/progress/{mock_user_id}",
        headers={"Authorization": "Bearer valid-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["total_sessions"] == 15
    assert data[0]["average_score"] == 87.5


def test_get_user_progress_forbidden_different_user(app, client, mock_user_id, mock_db):
    """Test getting progress for a different user (should be forbidden)."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    response = client.get(
        "/api/results/progress/different-user-id",
        headers={"Authorization": "Bearer valid-token"}
    )

    assert response.status_code == 403
    data = response.json()
    assert "own progress" in data["detail"].lower()


def test_get_user_progress_with_filter(app, client, mock_user_id, mock_db):
    """Test getting user progress with treatment type filter."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [{
        "treatment_type": "speech_echo",
        "total_sessions": 10
    }]

    response = client.get(
        f"/api/results/progress/{mock_user_id}?treatment_type=speech_echo",
        headers={"Authorization": "Bearer valid-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


def test_get_my_results_unauthorized(client):
    """Test getting own results without authentication."""
    response = client.get("/api/results/my-results")
    assert response.status_code == 401


def test_get_my_results_success(app, client, mock_user_id, mock_db):
    """Test getting own results successfully."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [
        {"id": "result-1", "score": 85},
        {"id": "result-2", "score": 90}
    ]

    response = client.get(
        "/api/results/my-results",
        headers={"Authorization": "Bearer valid-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_get_my_progress_unauthorized(client):
    """Test getting own progress without authentication."""
    response = client.get("/api/results/my-progress")
    assert response.status_code == 401


def test_get_my_progress_success(app, client, mock_user_id, mock_db):
    """Test getting own progress successfully."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [{
        "id": "progress-1",
        "treatment_type": "speech_echo",
        "total_sessions": 20,
        "average_score": 88.0
    }]

    response = client.get(
        "/api/results/my-progress",
        headers={"Authorization": "Bearer valid-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["total_sessions"] == 20


def test_get_my_progress_with_filter(app, client, mock_user_id, mock_db):
    """Test getting own progress with treatment type filter."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [{
        "treatment_type": "speech_echo",
        "total_sessions": 10
    }]

    response = client.get(
        "/api/results/my-progress?treatment_type=speech_echo",
        headers={"Authorization": "Bearer valid-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data[0]["treatment_type"] == "speech_echo"
