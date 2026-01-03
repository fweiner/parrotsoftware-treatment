-- Add voice preference to profiles table
-- Allows users to choose between male, female, or neutral voice for TTS

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS voice_gender TEXT DEFAULT 'female'
CHECK (voice_gender IN ('male', 'female', 'neutral'));

COMMENT ON COLUMN public.profiles.voice_gender IS 'User preference for TTS voice gender: male, female, or neutral';
