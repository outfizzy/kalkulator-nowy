DO $$ 
BEGIN 
    ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
    ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN ('new', 'contacted', 'offer_sent', 'negotiation', 'won', 'lost', 'fair'));
END $$;
