-- Add answer matching accommodation settings to profiles
-- These settings control how spoken answers are evaluated for correctness

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_acceptable_alternatives BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_partial_substring BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_word_overlap BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_stop_word_filtering BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_synonyms BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_first_name_only BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN profiles.match_acceptable_alternatives IS 'Accept predefined alternative answers (e.g., "dad" for "father")';
COMMENT ON COLUMN profiles.match_partial_substring IS 'Accept partial matches where answer contains expected or vice versa';
COMMENT ON COLUMN profiles.match_word_overlap IS 'Accept answers with 50%+ word overlap';
COMMENT ON COLUMN profiles.match_stop_word_filtering IS 'Filter filler words (the, a, when, we) before comparing';
COMMENT ON COLUMN profiles.match_synonyms IS 'Accept semantic equivalents (kind=nice, home=house)';
COMMENT ON COLUMN profiles.match_first_name_only IS 'Accept first name when full name expected';
