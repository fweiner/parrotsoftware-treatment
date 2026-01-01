-- Short-Term Memory Treatment Tables
-- Helps users practice recalling grocery lists with adjustable difficulty

-- Grocery items table (stimulus pool)
CREATE TABLE IF NOT EXISTS public.stm_grocery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, -- produce, dairy, pantry, meat, beverages
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Short-term memory sessions table
CREATE TABLE IF NOT EXISTS public.stm_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    list_length INTEGER NOT NULL CHECK (list_length >= 2 AND list_length <= 5),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_correct INTEGER DEFAULT 0,
    total_trials INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session trials table (each trial within a session)
CREATE TABLE IF NOT EXISTS public.stm_session_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.stm_sessions(id) ON DELETE CASCADE NOT NULL,
    trial_number INTEGER NOT NULL CHECK (trial_number >= 1 AND trial_number <= 10),
    list_length INTEGER NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    items_correct INTEGER DEFAULT 0,
    is_fully_correct BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trial items table (target items for each trial)
CREATE TABLE IF NOT EXISTS public.stm_trial_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trial_id UUID REFERENCES public.stm_session_trials(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES public.stm_grocery_items(id),
    item_name TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 1),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recall attempts table (user responses)
CREATE TABLE IF NOT EXISTS public.stm_recall_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trial_id UUID REFERENCES public.stm_session_trials(id) ON DELETE CASCADE NOT NULL,
    target_item_id UUID REFERENCES public.stm_trial_items(id),
    target_item_name TEXT NOT NULL,
    spoken_item TEXT,
    match_confidence DECIMAL(3, 2) CHECK (match_confidence >= 0 AND match_confidence <= 1),
    is_correct BOOLEAN DEFAULT FALSE,
    is_partial BOOLEAN DEFAULT FALSE,
    time_to_recall INTEGER, -- milliseconds
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stm_sessions_user_id ON public.stm_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stm_sessions_started_at ON public.stm_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_stm_session_trials_session_id ON public.stm_session_trials(session_id);
CREATE INDEX IF NOT EXISTS idx_stm_trial_items_trial_id ON public.stm_trial_items(trial_id);
CREATE INDEX IF NOT EXISTS idx_stm_recall_attempts_trial_id ON public.stm_recall_attempts(trial_id);

-- Enable Row Level Security
ALTER TABLE public.stm_grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stm_session_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stm_trial_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stm_recall_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stm_grocery_items (public read)
CREATE POLICY "Anyone can read grocery items"
    ON public.stm_grocery_items FOR SELECT
    USING (true);

-- RLS Policies for stm_sessions
CREATE POLICY "Users can view own stm sessions"
    ON public.stm_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own stm sessions"
    ON public.stm_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stm sessions"
    ON public.stm_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for stm_session_trials (access through session ownership)
CREATE POLICY "Users can view own stm trials"
    ON public.stm_session_trials FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM public.stm_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own stm trials"
    ON public.stm_session_trials FOR INSERT
    WITH CHECK (
        session_id IN (
            SELECT id FROM public.stm_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own stm trials"
    ON public.stm_session_trials FOR UPDATE
    USING (
        session_id IN (
            SELECT id FROM public.stm_sessions WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for stm_trial_items
CREATE POLICY "Users can view own stm trial items"
    ON public.stm_trial_items FOR SELECT
    USING (
        trial_id IN (
            SELECT t.id FROM public.stm_session_trials t
            JOIN public.stm_sessions s ON t.session_id = s.id
            WHERE s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own stm trial items"
    ON public.stm_trial_items FOR INSERT
    WITH CHECK (
        trial_id IN (
            SELECT t.id FROM public.stm_session_trials t
            JOIN public.stm_sessions s ON t.session_id = s.id
            WHERE s.user_id = auth.uid()
        )
    );

-- RLS Policies for stm_recall_attempts
CREATE POLICY "Users can view own stm recall attempts"
    ON public.stm_recall_attempts FOR SELECT
    USING (
        trial_id IN (
            SELECT t.id FROM public.stm_session_trials t
            JOIN public.stm_sessions s ON t.session_id = s.id
            WHERE s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own stm recall attempts"
    ON public.stm_recall_attempts FOR INSERT
    WITH CHECK (
        trial_id IN (
            SELECT t.id FROM public.stm_session_trials t
            JOIN public.stm_sessions s ON t.session_id = s.id
            WHERE s.user_id = auth.uid()
        )
    );

-- Insert default grocery items
INSERT INTO public.stm_grocery_items (name, category) VALUES
    ('apples', 'produce'),
    ('bananas', 'produce'),
    ('oranges', 'produce'),
    ('milk', 'dairy'),
    ('cheese', 'dairy'),
    ('yogurt', 'dairy'),
    ('bread', 'pantry'),
    ('eggs', 'dairy'),
    ('chicken', 'meat'),
    ('beef', 'meat'),
    ('fish', 'meat'),
    ('rice', 'pantry'),
    ('pasta', 'pantry'),
    ('cereal', 'pantry'),
    ('tomatoes', 'produce'),
    ('lettuce', 'produce'),
    ('carrots', 'produce'),
    ('potatoes', 'produce'),
    ('onions', 'produce'),
    ('garlic', 'produce'),
    ('butter', 'dairy'),
    ('juice', 'beverages'),
    ('soda', 'beverages'),
    ('water', 'beverages'),
    ('coffee', 'beverages'),
    ('tea', 'beverages'),
    ('sugar', 'pantry'),
    ('flour', 'pantry'),
    ('salt', 'pantry'),
    ('pepper', 'pantry')
ON CONFLICT (name) DO NOTHING;

-- Helper function to get random grocery items for a trial
CREATE OR REPLACE FUNCTION get_random_grocery_items(p_count INTEGER)
RETURNS TABLE (id UUID, name TEXT, category TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT gi.id, gi.name, gi.category
    FROM public.stm_grocery_items gi
    ORDER BY random()
    LIMIT p_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's STM progress stats
CREATE OR REPLACE FUNCTION get_stm_progress(p_user_id UUID)
RETURNS TABLE (
    total_sessions BIGINT,
    total_trials BIGINT,
    total_items_correct BIGINT,
    average_accuracy NUMERIC,
    max_list_length INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT s.id) as total_sessions,
        COALESCE(SUM(s.total_trials), 0) as total_trials,
        COALESCE(SUM(s.total_correct), 0) as total_items_correct,
        CASE
            WHEN SUM(s.total_trials * s.list_length) > 0
            THEN ROUND((SUM(s.total_correct)::NUMERIC / SUM(s.total_trials * s.list_length)) * 100, 1)
            ELSE 0
        END as average_accuracy,
        COALESCE(MAX(s.list_length), 0) as max_list_length
    FROM public.stm_sessions s
    WHERE s.user_id = p_user_id AND s.completed_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
