"""Shared test fixtures and configuration."""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def app():
    """Get the FastAPI app instance."""
    from app.main import app
    #Clear any existing overrides
    app.dependency_overrides.clear()
    yield app
    # Clean up overrides after test
    app.dependency_overrides.clear()


@pytest.fixture
def client(app):
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_user_id():
    """Mock user ID for testing."""
    return "test-user-123"


@pytest.fixture
def mock_user(mock_user_id):
    """Mock user object for testing."""
    return {
        "id": mock_user_id,
        "email": "test@example.com",
        "role": "authenticated"
    }


@pytest.fixture
def mock_db(mocker):
    """Mock Supabase database client."""
    mock = mocker.AsyncMock()
    mock.query.return_value = []
    mock.insert.return_value = {}
    mock.update.return_value = {}
    mock.delete.return_value = True
    return mock


@pytest.fixture
def mock_auth_token():
    """Mock JWT token for testing."""
    return "Bearer mock-jwt-token-123"


@pytest.fixture
def mock_auth_headers(mock_auth_token):
    """Mock authentication headers for testing."""
    return {"Authorization": mock_auth_token}
