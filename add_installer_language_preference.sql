-- Add language field to profiles table for installers
-- Supported languages: Polish (pl), Moldovan (mo), Ukrainian (uk)

ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'pl' CHECK (preferred_language IN ('pl', 'mo', 'uk'));

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.preferred_language IS 'Installer preferred language: pl (Polski), mo (Mołdawski), uk (Ukraiński)';
