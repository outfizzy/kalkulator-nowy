-- Create leads table
CREATE TABLE leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'offer_sent', 'negotiation', 'won', 'lost')),
    source TEXT NOT NULL CHECK (source IN ('email', 'phone', 'manual', 'website', 'other')),
    customer_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    assigned_to UUID REFERENCES auth.users(id),
    email_message_id TEXT, -- To link with email if created from one
    notes TEXT,
    last_contact_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policies

-- View: Admin/Manager see all, designated sales rep sees active, others see unassigned?
-- For now: Admin/Manager see all. Sales Reps see assigned + created by them?
-- Or Sales Reps see ALL leads to grab them?
-- Let's stick to: Everyone can see all leads for now to simplify "Round Robin" or "Grab" logic, 
-- or restrict to assigned. 
-- User requested: "visible in the menu and on the sales representative's dashboard".
-- If I assign a lead, only they should see it? Or everyone?
-- Let's make it visible to authenticated users for now for simplicity, or refine.
CREATE POLICY "Enable read access for authenticated users" ON leads
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert: Authenticated users can create leads
CREATE POLICY "Enable insert for authenticated users" ON leads
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Update: Authenticated users can update leads (e.g. change status, assign themselves)
CREATE POLICY "Enable update for authenticated users" ON leads
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Delete: Only admins? or verified users.
CREATE POLICY "Enable delete for authenticated users" ON leads
    FOR DELETE
    TO authenticated
    USING (true);

-- Indexes
CREATE INDEX leads_status_idx ON leads(status);
CREATE INDEX leads_assigned_to_idx ON leads(assigned_to);
CREATE INDEX leads_created_at_idx ON leads(created_at);
