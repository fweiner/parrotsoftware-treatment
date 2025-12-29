-- Find My Life Words Treatment Schema
-- Personalized aphasia treatment using patient's own family, friends, and personal items

-- Personal contacts table for storing patient's people/items
CREATE TABLE IF NOT EXISTS public.personal_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Core fields
    name TEXT NOT NULL,
    nickname TEXT,
    relationship TEXT NOT NULL,
    photo_url TEXT NOT NULL,

    -- Personalized cue data
    category TEXT,
    first_letter TEXT,
    description TEXT,
    association TEXT,
    location_context TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Life words sessions
CREATE TABLE IF NOT EXISTS public.life_words_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    contact_ids UUID[] NOT NULL,

    -- Session state
    is_completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Statistics (calculated on completion)
    total_correct INTEGER DEFAULT 0,
    total_incorrect INTEGER DEFAULT 0,
    average_cues_used NUMERIC(4,2) DEFAULT 0,
    average_response_time NUMERIC(6,2) DEFAULT 0,
    statistics JSONB DEFAULT '{}'::jsonb
);

-- Life words session responses
CREATE TABLE IF NOT EXISTS public.life_words_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.life_words_sessions(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.personal_contacts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Response data
    user_answer TEXT,
    correct_answer VARCHAR(255) NOT NULL,
    response_time NUMERIC(6,2),
    is_correct BOOLEAN,
    cues_used INTEGER DEFAULT 0,

    -- AI metrics (for future adaptive difficulty)
    speech_confidence FLOAT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.personal_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_words_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_words_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personal_contacts
CREATE POLICY "Users can view own personal contacts"
ON public.personal_contacts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own personal contacts"
ON public.personal_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal contacts"
ON public.personal_contacts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personal contacts"
ON public.personal_contacts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for life_words_sessions
CREATE POLICY "Users can view own life words sessions"
ON public.life_words_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own life words sessions"
ON public.life_words_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own life words sessions"
ON public.life_words_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own life words sessions"
ON public.life_words_sessions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for life_words_responses
CREATE POLICY "Users can view own life words responses"
ON public.life_words_responses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own life words responses"
ON public.life_words_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own life words responses"
ON public.life_words_responses FOR UPDATE USING (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX idx_personal_contacts_user_id ON public.personal_contacts(user_id);
CREATE INDEX idx_personal_contacts_active ON public.personal_contacts(user_id, is_active);
CREATE INDEX idx_life_words_sessions_user_id ON public.life_words_sessions(user_id);
CREATE INDEX idx_life_words_responses_session_id ON public.life_words_responses(session_id);

-- Function to auto-derive first_letter from name on insert/update
CREATE OR REPLACE FUNCTION derive_first_letter()
RETURNS TRIGGER AS $$
BEGIN
    NEW.first_letter := UPPER(LEFT(NEW.name, 1));
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-derive first_letter
CREATE TRIGGER personal_contacts_derive_first_letter
    BEFORE INSERT OR UPDATE ON public.personal_contacts
    FOR EACH ROW
    EXECUTE FUNCTION derive_first_letter();
