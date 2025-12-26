# Testing Documentation

## Overview

We use **pytest** for all backend testing with a focus on function-based tests and pytest-mock for mocking.

## Test Statistics

- **Total Tests**: 66
- **Code Coverage**: 97%
- **All Tests Passing**: ✅

## Test Organization

```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # Shared fixtures
│   ├── unit/                    # Unit tests (34 tests)
│   │   ├── core/
│   │   │   ├── test_auth.py           # 6 tests
│   │   │   └── test_database.py       # 7 tests
│   │   └── services/
│   │       ├── test_speech_service.py # 10 tests
│   │       └── test_treatment_service.py # 11 tests
│   └── integration/             # Integration tests (32 tests)
│       ├── test_auth_endpoints.py     # 4 tests
│       ├── test_treatment_endpoints.py # 15 tests
│       └── test_results_endpoints.py  # 13 tests
```

## Testing Standards

### Test Organization
- All tests in `backend/tests/` directory
- Function-based tests only (no class-based tests)
- Descriptive test function names (e.g., `test_create_session_returns_session_data`)
- Organized by feature area (unit vs integration)

### Mocking Requirements
- **ALWAYS use pytest-mock** - Use `mocker` fixture
- **NEVER use unittest.mock** - Completely banned from this codebase
- Mock external dependencies (Supabase, Google Cloud, OpenAI)
- Use FastAPI's `dependency_overrides` for integration tests

### Test Philosophy
- **Function-based only** - Matches codebase architecture
- **Test business value** - Focus on actual business logic
- **Avoid over-testing** - Don't test edge cases that aren't real scenarios
- **No framework testing** - Don't test FastAPI's built-in behavior

## Running Tests

### Run all tests
```bash
cd backend
uv run pytest
```

### Run with coverage
```bash
uv run pytest --cov=app --cov-report=html --cov-report=term
```

### Run specific test file
```bash
uv run pytest tests/unit/services/test_treatment_service.py
```

### Run tests matching pattern
```bash
uv run pytest -k "test_auth"
```

### Run with verbose output
```bash
uv run pytest -v
```

## Coverage Report

| Module | Coverage |
|--------|----------|
| app/config.py | 100% |
| app/core/auth.py | 100% |
| app/core/database.py | 100% |
| app/core/dependencies.py | 89% |
| app/main.py | 87% |
| app/models/schemas.py | 100% |
| app/routers/auth.py | 100% |
| app/routers/results.py | 100% |
| app/routers/treatments.py | 90% |
| app/services/speech_service.py | 100% |
| app/services/treatment_service.py | 98% |
| **TOTAL** | **97%** |

## CI/CD Integration

Tests are automatically run in GitHub Actions:

### On Pull Requests
- All tests must pass before merge
- Coverage report generated
- Results posted as PR comment

### On Release
- Tests run before building Docker images
- Deployment blocked if tests fail
- Minimum 80% coverage required

## Test Dependencies

```toml
[project.optional-dependencies]
test = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-mock>=3.12.0",
    "pytest-cov>=4.1.0",
]
```

## Common Test Fixtures

Defined in `tests/conftest.py`:
- `app`: FastAPI app instance with dependency override support
- `client`: Test client for API endpoints
- `mock_db`: Mocked Supabase database client
- `mock_user_id`: Test user ID
- `mock_user`: Test user object
- `mock_auth_headers`: Valid authentication headers

## Example Tests

### Unit Test Example
```python
@pytest.mark.asyncio
async def test_create_session(mock_db):
    """Test creating a treatment session."""
    from app.services.treatment_service import TreatmentService
    from app.models.schemas import TreatmentSessionCreate

    mock_db.insert.return_value = {
        "id": "session-123",
        "user_id": "user-123",
        "treatment_type": "speech_echo"
    }

    service = TreatmentService(mock_db)
    session_data = TreatmentSessionCreate(
        treatment_type="speech_echo",
        data={}
    )

    result = await service.create_session("user-123", session_data)

    assert result["id"] == "session-123"
    assert result["treatment_type"] == "speech_echo"
```

### Integration Test Example
```python
def test_get_user_sessions_success(app, client, mock_user_id, mock_db):
    """Test getting user sessions successfully."""
    from app.core.auth import get_current_user_id
    from app.core.dependencies import get_db

    # Override dependencies
    async def override_get_current_user_id():
        return mock_user_id

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    app.dependency_overrides[get_db] = override_get_db

    mock_db.query.return_value = [
        {"id": "session-1", "treatment_type": "speech_echo"}
    ]

    response = client.get(
        "/api/treatments/sessions",
        headers={"Authorization": "Bearer valid-token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
```

## Next Steps

- Maintain test coverage above 80%
- Add tests for new features before implementation
- Run tests locally before committing
- Review coverage reports regularly
