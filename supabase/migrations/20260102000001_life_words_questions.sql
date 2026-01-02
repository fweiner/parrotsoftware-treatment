-- Life Words Question-Based Recall Tables
-- Extends Life Words to include question-answer sessions about contacts

-- Question types enum-like reference
-- 1: relationship - "What is [Name]'s relationship to you?"
-- 2: association - "Where do you usually see [Name]?" / "What do you associate [Name] with?"
-- 3: interests - "What does [Name] enjoy doing?"
-- 4: personality - "How would you describe [Name]'s personality?"
-- 5: name_from_description - "Who is your [relationship] who likes [interest]?"

-- Question sessions table
CREATE TABLE IF NOT EXISTS public.life_words_question_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    contact_ids UUID[] NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT FALSE,
    -- Statistics
    total_questions INTEGER DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    average_response_time DECIMAL(10, 2) DEFAULT 0,
    average_clarity_score DECIMAL(3, 2) DEFAULT 0,
    statistics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual question responses
CREATE TABLE IF NOT EXISTS public.life_words_question_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.life_words_question_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.personal_contacts(id) ON DELETE SET NULL,
    -- Question details
    question_type INTEGER NOT NULL CHECK (question_type >= 1 AND question_type <= 5),
    question_text TEXT NOT NULL,
    expected_answer TEXT NOT NULL,
    -- Response details
    user_answer TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    is_partial BOOLEAN DEFAULT FALSE,
    -- Evaluation metrics
    response_time INTEGER, -- milliseconds from question shown to answer start
    clarity_score DECIMAL(3, 2) CHECK (clarity_score >= 0 AND clarity_score <= 1), -- speech confidence
    correctness_score DECIMAL(3, 2) CHECK (correctness_score >= 0 AND correctness_score <= 1), -- semantic match score
    -- Timing details
    question_shown_at TIMESTAMPTZ,
    answer_started_at TIMESTAMPTZ,
    answer_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lw_question_sessions_user_id ON public.life_words_question_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_lw_question_sessions_completed ON public.life_words_question_sessions(is_completed);
CREATE INDEX IF NOT EXISTS idx_lw_question_responses_session_id ON public.life_words_question_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_lw_question_responses_contact_id ON public.life_words_question_responses(contact_id);

-- Enable Row Level Security
ALTER TABLE public.life_words_question_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_words_question_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question sessions
CREATE POLICY "Users can view own question sessions"
    ON public.life_words_question_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own question sessions"
    ON public.life_words_question_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own question sessions"
    ON public.life_words_question_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for question responses
CREATE POLICY "Users can view own question responses"
    ON public.life_words_question_responses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own question responses"
    ON public.life_words_question_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own question responses"
    ON public.life_words_question_responses FOR UPDATE
    USING (auth.uid() = user_id);
