-- Ensure Service Tickets table exists (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_ticket_status') THEN
        CREATE TYPE service_ticket_status AS ENUM ('new', 'open', 'scheduled', 'resolved', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_ticket_priority') THEN
        CREATE TYPE service_ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_ticket_type') THEN
        CREATE TYPE service_ticket_type AS ENUM ('leak', 'electrical', 'visual', 'mechanical', 'other');
    END IF;
END $$;

create table if not exists service_tickets (
  id uuid default gen_random_uuid() primary key,
  ticket_number text unique not null,
  client_id uuid references customers(id),
  contract_id uuid references contracts(id),
  installation_id uuid references installations(id),
  status service_ticket_status default 'new',
  priority service_ticket_priority default 'medium',
  type service_ticket_type not null,
  description text not null,
  resolution_notes text,
  scheduled_date timestamp with time zone,
  assigned_team_id uuid references teams(id),
  photos text[] default array[]::text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table service_tickets enable row level security;

-- Re-apply policies to be sure
DO $$ BEGIN
    DROP POLICY IF EXISTS "Enable insert for everyone" ON service_tickets;
    CREATE POLICY "Enable insert for everyone" on service_tickets for insert with check (true);

    DROP POLICY IF EXISTS "Enable all for authenticated users" ON service_tickets;
    CREATE POLICY "Enable all for authenticated users" on service_tickets for all using (auth.role() = 'authenticated');
END $$;
