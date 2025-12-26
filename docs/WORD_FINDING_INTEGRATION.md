# Word Finding Treatment Integration

## Overview
Integrating the standalone word-finding application from `c:\dev\word_finding` into the main treatment platform.

## What Was Done

### 1. Images Copied ✅
- **Location**: `frontend/public/images/word-finding/`
- **Count**: 91 images (1.jpg through 90.jpg plus blank.jpg)
- **Source**: `c:\dev\word_finding/public/images/`

### 2. Required Database Schema

Add to your Supabase migrations:

```sql
-- Stimuli table for word-finding images
CREATE TABLE IF NOT EXISTS public.word_finding_stimuli (
    id SERIAL PRIMARY KEY,
    image VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    first_letter VARCHAR(1) NOT NULL,
    category VARCHAR(255) NOT NULL,
    action TEXT,
    association TEXT,
    features TEXT,
    location TEXT,
    alternatives TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Word-finding sessions
CREATE TABLE IF NOT EXISTS public.word_finding_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    stimuli_ids INTEGER[],
    total_correct INTEGER DEFAULT 0,
    total_incorrect INTEGER DEFAULT 0,
    average_cues_used NUMERIC(4,2) DEFAULT 0,
    average_response_time NUMERIC(6,2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE
);

-- Word-finding session responses
CREATE TABLE IF NOT EXISTS public.word_finding_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.word_finding_sessions(id) ON DELETE CASCADE,
    stimulus_id INTEGER REFERENCES public.word_finding_stimuli(id),
    is_correct BOOLEAN NOT NULL,
    cues_used INTEGER DEFAULT 0,
    response_time NUMERIC(6,2),
    user_answer TEXT,
    correct_answer VARCHAR(255) NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.word_finding_stimuli ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_finding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_finding_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stimuli are viewable by everyone" ON public.word_finding_stimuli FOR SELECT USING (true);
CREATE POLICY "Users can view own sessions" ON public.word_finding_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.word_finding_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.word_finding_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own responses" ON public.word_finding_responses FOR SELECT USING (EXISTS (SELECT 1 FROM public.word_finding_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "Users can create responses for own sessions" ON public.word_finding_responses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.word_finding_sessions WHERE id = session_id AND user_id = auth.uid()));

-- Insert sample stimuli data (you'll need to populate this with the actual cue data)
-- Example:
-- INSERT INTO public.word_finding_stimuli (id, image, name, first_letter, category, action, association, features, location, alternatives)
-- VALUES
--   (1, '1.jpg', 'apple', 'A', 'fruit', 'eat', 'doctor', 'red, round', 'tree', ARRAY['fruit']),
--   ...
```

### 3. Backend API Endpoints Needed

Create in `backend/app/routers/word_finding.py`:

```python
from fastapi import APIRouter, Depends
from app.core.dependencies import CurrentUserId, Database
from app.models.schemas import WordFindingSessionCreate, WordFindingSessionResponse

router = APIRouter()

@router.post("/sessions")
async def create_word_finding_session(user_id: CurrentUserId, db: Database):
    """Create a new word-finding session with 10 random stimuli"""
    # Select 10 random stimuli
    # Create session record
    # Return session ID and stimuli data

@router.post("/sessions/{session_id}/responses")
async def save_response(session_id: str, response: dict, user_id: CurrentUserId, db: Database):
    """Save a response for a stimulus in the session"""
    # Save response
    # Update session statistics

@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user_id: CurrentUserId, db: Database):
    """Get session details and progress"""
    # Return session with responses

@router.get("/stimuli")
async def get_all_stimuli(db: Database):
    """Get all available stimuli (for admin/testing)"""
    # Return all stimuli
```

### 4. Frontend Components to Migrate

From `c:\dev\word_finding/components/session/`:
- `SessionComponent.tsx` - Main orchestrator
- `ImageDisplay.tsx` - Shows the image
- `CueSystem.tsx` - 8-level hierarchical cues
- `SpeechRecognitionButton.tsx` - Web Speech API integration
- `Timer.tsx` - 30-second countdown
- `SessionProgress.tsx` - Progress indicator

### 5. Key Features

**8-Level Cue System:**
1. Encouragement ("Try again!")
2. First letter
3. Category
4. Action/verb
5. Association
6. Features/description
7. Location
8. Show answer

**Workflow:**
1. User sees image
2. Timer starts (30 seconds)
3. User speaks word or requests cue
4. Speech recognition matches answer
5. Track: correct/incorrect, cues used, response time
6. Move to next stimulus (10 total per session)

## Integration Status

- ✅ Images copied to `frontend/public/images/word-finding/`
- ⏳ Database schema (needs to be run in Supabase)
- ⏳ Backend API endpoints (needs implementation)
- ⏳ Frontend page (needs component migration)
- ⏳ Stimuli data population (needs CSV/JSON with cues for all 90 images)

## Next Steps

1. Run database migration in Supabase SQL Editor
2. Populate stimuli data with cue information
3. Create backend router and endpoints
4. Migrate and adapt React components
5. Update word-finding page to use new components
6. Test end-to-end workflow
