-- Add customer_id to offers table
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Link existing offers to customers based on matching data
-- We match by email OR (firstName + lastName + city) to be consistent with previous logic
UPDATE offers o
SET customer_id = c.id
FROM customers c
WHERE 
    (o.customer_data->>'email' IS NOT NULL AND LOWER(o.customer_data->>'email') = LOWER(c.email))
    OR 
    (
        LOWER(o.customer_data->>'firstName') = LOWER(c.first_name) AND 
        LOWER(o.customer_data->>'lastName') = LOWER(c.last_name) AND
        LOWER(o.customer_data->>'city') = LOWER(c.city)
    );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_offers_customer_id ON offers(customer_id);
