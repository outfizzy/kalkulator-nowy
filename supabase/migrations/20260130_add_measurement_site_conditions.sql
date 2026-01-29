-- Add site_details column to project_measurements for technical survey data
ALTER TABLE public.project_measurements 
ADD COLUMN IF NOT EXISTS site_details JSONB DEFAULT '{}'::jsonb;
