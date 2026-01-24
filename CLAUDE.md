# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Guidelines

### Thin Client Architecture
**Do not add business logic to the frontend.** This project follows a strict thin client architecture where as much logic as possible is handled on the backend. The frontend should only handle UI rendering, user interactions, and API calls. All validation, data processing, calculations, and business rules must be implemented in the backend.

### Mobile Responsive
**All pages must be fully responsive and work on mobile-sized devices.** Design mobile-first, test at 320px-480px viewport widths, use responsive CSS (flexbox, grid, media queries), ensure touch targets are at least 44x44px, and avoid horizontal scrolling.

### Verify Before Complete
**Use Chrome DevTools to confirm a feature works properly before considering it complete.** Test the actual UI in the browser, check console for errors, verify network requests succeed, and validate the user flow end-to-end. Do not rely solely on unit tests or code review.

## Build & Run Commands

### Frontend (Next.js)
```bash
cd frontend
npm run dev      # Development server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

### Backend (FastAPI)
```bash
cd backend
uv sync                                    # Install dependencies
uv sync --extra test                       # Install with test dependencies
uv run uvicorn app.main:app --reload       # Development server at http://localhost:8000
uv run pytest                              # Run all tests
uv run pytest -k "test_name"               # Run specific test
uv run pytest --cov=app --cov-report=html  # Coverage report
uv run ruff check app/                     # Python linting
```

## Architecture

### System Overview
```
Browser (Next.js Frontend, localhost:3000)
    ↓
Supabase (Auth + PostgreSQL + Storage)
    ↓
FastAPI Backend (localhost:8000)
    ↓
External APIs: Google Cloud Speech/TTS, OpenAI GPT-4o-mini, Resend Email
```

### Backend Structure (Service Layer Pattern)
```
Router (HTTP endpoints) → Service (business logic) → Database Client (Supabase REST)
```

Key directories:
- `backend/app/routers/` - API endpoint definitions
- `backend/app/services/` - Business logic (speech, treatment, email, AI services)
- `backend/app/core/` - Database client, auth, dependencies
- `backend/app/models/schemas.py` - Pydantic request/response models

### Frontend Structure (Next.js App Router)
```
frontend/app/
├── (auth)/           # Public routes: login, signup
├── (dashboard)/      # Protected routes (middleware-guarded)
│   └── treatments/   # Treatment pages: word-finding, life-words, short-term-memory
├── message/          # Public messaging page
└── invite/           # Invite acceptance page
```

Route groups `(auth)` and `(dashboard)` control layout and auth requirements.

## Database

Uses Supabase PostgreSQL with Row-Level Security (RLS) enabled on all tables. Key tables:
- `profiles` - User profiles (auto-created via trigger from auth.users)
- `treatment_sessions`, `treatment_results`, `user_progress` - Treatment data
- `personal_contacts`, `personal_items` - Life Words user content
- `word_finding_stimuli` - Word finding images and metadata
- `life_words_*` tables - Session and response tracking

## Testing

Backend has 66 tests (97% coverage). Use function-based tests only, no test classes.

```python
# Use pytest-mock, not unittest.mock
def test_example(mocker):
    mock_service = mocker.patch("app.services.example_service")
    # ...
```

Integration tests use FastAPI's `dependency_overrides` for mocking auth and database.

## UI/UX Requirements

Target audience is elderly users with cognitive impairments:
- Large fonts (18px base minimum)
- High contrast colors
- Clear, simple navigation
- WCAG AAA compliance goal

## Deployment

GitHub Actions CI/CD triggers on release tags (v*):
1. Runs backend tests (80% minimum coverage required)
2. Builds Docker images → Google Artifact Registry
3. Deploys to Google Cloud Run

Production: app.parrotsoftware.com
