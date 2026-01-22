-- Add pronunciation field to personal_contacts and personal_items tables
-- This allows users to specify how a name should be pronounced by TTS

-- Add pronunciation column to personal_contacts
ALTER TABLE personal_contacts
ADD COLUMN IF NOT EXISTS pronunciation TEXT;

-- Add pronunciation column to personal_items
ALTER TABLE personal_items
ADD COLUMN IF NOT EXISTS pronunciation TEXT;

-- Add comments for documentation
COMMENT ON COLUMN personal_contacts.pronunciation IS 'How to pronounce the name (e.g., "Wyner" for "Weiner"). Used by TTS.';
COMMENT ON COLUMN personal_items.pronunciation IS 'How to pronounce the item name. Used by TTS.';
