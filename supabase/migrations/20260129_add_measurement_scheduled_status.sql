-- Add 'measurement_scheduled' to the leads check constraint
-- Original constraint was: CHECK (status IN ('new', 'contacted', 'offer_sent', 'negotiation', 'won', 'lost', 'fair'))
-- We need to add 'measurement_scheduled'

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE leads 
ADD CONSTRAINT leads_status_check 
CHECK (status IN (
    'new', 
    'contacted', 
    'measurement_scheduled', -- New status
    'offer_sent', 
    'negotiation', 
    'won', 
    'lost', 
    'fair'
));
