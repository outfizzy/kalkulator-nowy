-- Fix foreign key constraints for team references
-- Problem: Some tables reference 'teams' but should reference 'installation_teams'

-- 1. Drop existing constraints on installations.team_id (if any)
ALTER TABLE public.installations 
DROP CONSTRAINT IF EXISTS installations_team_id_fkey;

-- 2. Re-add correct foreign key to installation_teams
ALTER TABLE public.installations 
ADD CONSTRAINT installations_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.installation_teams(id) ON DELETE SET NULL;

-- 3. Fix service_tickets if needed
ALTER TABLE public.service_tickets 
DROP CONSTRAINT IF EXISTS service_tickets_assigned_team_id_fkey;

-- Check if installation_teams constraint exists, if not add it
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'service_tickets' 
               AND column_name = 'assigned_team_id') THEN
        ALTER TABLE public.service_tickets 
        ADD CONSTRAINT service_tickets_assigned_team_id_fkey 
        FOREIGN KEY (assigned_team_id) REFERENCES public.installation_teams(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, ignore
    NULL;
END $$;

-- 4. Fix team_unavailability if needed
ALTER TABLE public.team_unavailability 
DROP CONSTRAINT IF EXISTS team_unavailability_team_id_fkey;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'team_unavailability') THEN
        ALTER TABLE public.team_unavailability 
        ADD CONSTRAINT team_unavailability_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES public.installation_teams(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;
