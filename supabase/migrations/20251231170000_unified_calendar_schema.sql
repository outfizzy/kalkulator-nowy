-- Migration for Unified Calendar & LEO Integration

-- 1. Add 'source_type' enum and column
DO $$ BEGIN
    CREATE TYPE installation_source_type AS ENUM ('contract', 'service', 'manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.installations 
ADD COLUMN IF NOT EXISTS source_type installation_source_type DEFAULT 'contract';

-- 2. Add 'source_id' column (generic link to contract/ticket)
ALTER TABLE public.installations 
ADD COLUMN IF NOT EXISTS source_id UUID;

-- 3. Add 'parts_status' enum and column
DO $$ BEGIN
    CREATE TYPE installation_parts_status AS ENUM ('none', 'partial', 'all_delivered');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.installations 
ADD COLUMN IF NOT EXISTS parts_status installation_parts_status DEFAULT 'none';

-- 4. Add 'customer_feedback' jsonb for LEO history
ALTER TABLE public.installations 
ADD COLUMN IF NOT EXISTS customer_feedback JSONB DEFAULT '{}'::jsonb;

-- 5. Add 'title' for manual tasks
ALTER TABLE public.installations 
ADD COLUMN IF NOT EXISTS title TEXT;

-- 6. Add 'service_ticket_id'FK (optional direct link if needed, but source_id covers it)
-- We'll keep source_id as the primary pattern, but maybe add FK constraint if possible?
-- Since source_id is polymorphic, we can't strict FK easily without complex checks.
-- logic will handle relationships.

-- 7. Index for performance
CREATE INDEX IF NOT EXISTS idx_installations_source_type ON public.installations(source_type);
CREATE INDEX IF NOT EXISTS idx_installations_parts_status ON public.installations(parts_status);
