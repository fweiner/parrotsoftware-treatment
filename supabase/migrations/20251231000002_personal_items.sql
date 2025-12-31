-- Personal Items table for Life Words "My Stuff" feature
-- Stores user's personal items/objects for practice questions

CREATE TABLE IF NOT EXISTS public.personal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Core fields
    name TEXT NOT NULL,
    photo_url TEXT NOT NULL,

    -- Item details
    purpose TEXT,
    features TEXT,
    category TEXT,
    size TEXT,
    shape TEXT,
    color TEXT,
    weight TEXT,
    location TEXT,
    associated_with TEXT,

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.personal_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own personal items"
ON public.personal_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own personal items"
ON public.personal_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal items"
ON public.personal_items FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personal items"
ON public.personal_items FOR DELETE USING (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX idx_personal_items_user_id ON public.personal_items(user_id);
CREATE INDEX idx_personal_items_active ON public.personal_items(user_id, is_active);
