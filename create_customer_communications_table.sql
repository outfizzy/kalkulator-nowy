-- Create a table for storing unified communication history
CREATE TABLE IF NOT EXISTS public.customer_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id), -- The staff member involved
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL, -- Linked Customer
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL, -- Linked Lead
    type TEXT NOT NULL CHECK (type IN ('email', 'call', 'sms', 'note')),
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    subject TEXT, -- Email subject or call summary
    content TEXT, -- Email body or call notes
    date TIMESTAMPTZ DEFAULT NOW(),
    external_id TEXT, -- Message-ID for emails to prevent duplicates
    metadata JSONB DEFAULT '{}'::JSONB, -- Extra data (attachments metadata, call duration, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add lead_id to offers to track conversion lineage
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all communications (for now, or refine by role)
DROP POLICY IF EXISTS "Users can view all communications" ON public.customer_communications;
CREATE POLICY "Users can view all communications"
ON public.customer_communications
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Users can insert communications
DROP POLICY IF EXISTS "Users can insert communications" ON public.customer_communications;
CREATE POLICY "Users can insert communications"
ON public.customer_communications
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_communications_customer_id ON public.customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_lead_id ON public.customer_communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_external_id ON public.customer_communications(external_id);

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload config';
