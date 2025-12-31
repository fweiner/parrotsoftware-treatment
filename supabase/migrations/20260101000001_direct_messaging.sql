-- Direct Messaging Feature for Life Words
-- Enables two-way multimedia conversations between users and their contacts

-- =====================================================
-- Table: contact_messaging_tokens
-- Stores shareable links that allow contacts to message users
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contact_messaging_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.personal_contacts(id) ON DELETE CASCADE NOT NULL,

    -- Token for public access
    token TEXT NOT NULL UNIQUE,

    -- Token state
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,

    -- Ensure one token per contact
    UNIQUE(contact_id)
);

-- Enable Row Level Security
ALTER TABLE public.contact_messaging_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Users can view own messaging tokens"
    ON public.contact_messaging_tokens
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messaging tokens"
    ON public.contact_messaging_tokens
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messaging tokens"
    ON public.contact_messaging_tokens
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messaging tokens"
    ON public.contact_messaging_tokens
    FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_messaging_tokens_user_id ON public.contact_messaging_tokens(user_id);
CREATE INDEX idx_messaging_tokens_contact_id ON public.contact_messaging_tokens(contact_id);
CREATE INDEX idx_messaging_tokens_token ON public.contact_messaging_tokens(token);

-- =====================================================
-- Table: messages
-- Stores all messages between users and their contacts
-- =====================================================

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.personal_contacts(id) ON DELETE CASCADE NOT NULL,

    -- Message direction: 'user_to_contact' or 'contact_to_user'
    direction TEXT NOT NULL CHECK (direction IN ('user_to_contact', 'contact_to_user')),

    -- Content (at least one must be present)
    text_content TEXT,
    photo_url TEXT,
    voice_url TEXT,
    voice_duration_seconds INTEGER,

    -- Read status (for messages from contacts)
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure at least one content type is present
    CONSTRAINT message_has_content CHECK (
        text_content IS NOT NULL OR
        photo_url IS NOT NULL OR
        voice_url IS NOT NULL
    )
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Users can view own messages"
    ON public.messages
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages"
    ON public.messages
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
    ON public.messages
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
    ON public.messages
    FOR DELETE
    USING (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_contact_id ON public.messages(contact_id);
CREATE INDEX idx_messages_user_contact ON public.messages(user_id, contact_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_unread ON public.messages(user_id, is_read) WHERE is_read = FALSE;

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to get unread message counts per contact for a user
CREATE OR REPLACE FUNCTION get_unread_message_counts(p_user_id UUID)
RETURNS TABLE(contact_id UUID, unread_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT m.contact_id, COUNT(*) as unread_count
    FROM public.messages m
    WHERE m.user_id = p_user_id
      AND m.direction = 'contact_to_user'
      AND m.is_read = FALSE
    GROUP BY m.contact_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total unread count for a user
CREATE OR REPLACE FUNCTION get_total_unread_count(p_user_id UUID)
RETURNS BIGINT AS $$
DECLARE
    total BIGINT;
BEGIN
    SELECT COUNT(*) INTO total
    FROM public.messages
    WHERE user_id = p_user_id
      AND direction = 'contact_to_user'
      AND is_read = FALSE;
    RETURN COALESCE(total, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
