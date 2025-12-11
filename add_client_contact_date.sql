-- Add client_will_contact_at column to leads and offers tables

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS client_will_contact_at TIMESTAMPTZ;

ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS client_will_contact_at TIMESTAMPTZ;

-- Add index for querying upcoming contacts
CREATE INDEX IF NOT EXISTS leads_client_will_contact_at_idx ON leads(client_will_contact_at);
CREATE INDEX IF NOT EXISTS offers_client_will_contact_at_idx ON offers(client_will_contact_at);
