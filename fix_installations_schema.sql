-- Allow scheduled_date to be NULL for pending installations
ALTER TABLE public.installations ALTER COLUMN scheduled_date DROP NOT NULL;
