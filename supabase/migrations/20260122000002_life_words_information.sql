-- Life Words Information Practice Tables
-- Allows users to practice recalling their own personal information (phone, address, birthday, etc.)

-- Information sessions table
CREATE TABLE IF NOT EXISTS public.life_words_information_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT FALSE,
    -- Statistics
    total_items INTEGER DEFAULT 5,
    total_correct INTEGER DEFAULT 0,
    total_hints_used INTEGER DEFAULT 0,
    total_timeouts INTEGER DEFAULT 0,
    average_response_time DECIMAL(10, 2) DEFAULT 0,
    statistics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual information responses
CREATE TABLE IF NOT EXISTS public.life_words_information_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.life_words_information_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    -- Item details
    field_name TEXT NOT NULL, -- e.g., 'phone_number', 'address_city', 'date_of_birth'
    field_label TEXT NOT NULL, -- Human-readable label e.g., 'phone number', 'city'
    teach_text TEXT NOT NULL, -- e.g., "Your phone number is 555-1234"
    question_text TEXT NOT NULL, -- e.g., "What is your phone number?"
    expected_answer TEXT NOT NULL, -- The correct answer
    hint_text TEXT, -- e.g., "The first digit is 5"
    -- Response details
    user_answer TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    used_hint BOOLEAN DEFAULT FALSE,
    timed_out BOOLEAN DEFAULT FALSE,
    -- Timing
    response_time INTEGER, -- milliseconds from question shown to answer
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lw_information_sessions_user_id ON public.life_words_information_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_lw_information_sessions_completed ON public.life_words_information_sessions(is_completed);
CREATE INDEX IF NOT EXISTS idx_lw_information_responses_session_id ON public.life_words_information_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_lw_information_responses_field_name ON public.life_words_information_responses(field_name);

-- Enable Row Level Security
ALTER TABLE public.life_words_information_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_words_information_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for information sessions
CREATE POLICY "Users can view own information sessions"
    ON public.life_words_information_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own information sessions"
    ON public.life_words_information_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own information sessions"
    ON public.life_words_information_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for information responses
CREATE POLICY "Users can view own information responses"
    ON public.life_words_information_responses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own information responses"
    ON public.life_words_information_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own information responses"
    ON public.life_words_information_responses FOR UPDATE
    USING (auth.uid() = user_id);
