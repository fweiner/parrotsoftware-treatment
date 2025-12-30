-- Contact Invites Table
-- Allows users to invite external contacts to fill out their own information

CREATE TABLE IF NOT EXISTS public.contact_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Invite details
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    custom_message TEXT,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    completed_at TIMESTAMPTZ,

    -- Result - links to the created contact
    contact_id UUID REFERENCES public.personal_contacts(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.contact_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Users can view own invites"
    ON public.contact_invites
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own invites"
    ON public.contact_invites
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invites"
    ON public.contact_invites
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invites"
    ON public.contact_invites
    FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_contact_invites_user_id ON public.contact_invites(user_id);
CREATE INDEX idx_contact_invites_token ON public.contact_invites(token);
CREATE INDEX idx_contact_invites_status ON public.contact_invites(status);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_invites TO authenticated;

-- Grant access to service role for backend operations
GRANT ALL ON public.contact_invites TO service_role;
