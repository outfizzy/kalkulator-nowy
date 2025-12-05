-- Add email_config column to profiles table to store SMTP/IMAP settings
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_config JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.profiles.email_config IS 'Stores user email configuration (SMTP/IMAP settings and signature)';
