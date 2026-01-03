-- Add 'in_progress' and 'closed' to service_ticket_status enum
DO $$ BEGIN
    ALTER TYPE service_ticket_status ADD VALUE IF NOT EXISTS 'in_progress';
    ALTER TYPE service_ticket_status ADD VALUE IF NOT EXISTS 'closed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
