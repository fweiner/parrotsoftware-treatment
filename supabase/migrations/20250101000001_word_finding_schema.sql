-- Word Finding Treatment Schema
-- This adds support for the word-finding treatment with hierarchical cue system

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

-- Enable RLS
ALTER TABLE public.word_finding_stimuli ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_finding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_finding_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stimuli
CREATE POLICY "Stimuli are viewable by everyone"
ON public.word_finding_stimuli FOR SELECT USING (true);

-- RLS Policies for sessions
CREATE POLICY "Users can view own word-finding sessions"
ON public.word_finding_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own word-finding sessions"
ON public.word_finding_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own word-finding sessions"
ON public.word_finding_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own word-finding sessions"
ON public.word_finding_sessions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for responses
CREATE POLICY "Users can view own word-finding responses"
ON public.word_finding_responses FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.word_finding_sessions
    WHERE id = session_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create responses for own word-finding sessions"
ON public.word_finding_responses FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.word_finding_sessions
    WHERE id = session_id AND user_id = auth.uid()
));

-- NOTE: Run the stimuli data insert separately using:
-- supabase/migrations/20250101000002_word_finding_data.sql
