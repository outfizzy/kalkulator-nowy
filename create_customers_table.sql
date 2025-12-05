-- Re-create customers table (DROP first to ensure schema matches)
DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    
    -- Personal Data
    salutation TEXT,
    first_name TEXT,
    last_name TEXT NOT NULL,
    
    -- Address
    street TEXT,
    house_number TEXT,
    postal_code TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT DEFAULT 'Deutschland',
    
    -- Contact
    phone TEXT,
    email TEXT,
    
    -- Metadata
    notes TEXT,
    source TEXT DEFAULT 'manual' -- 'manual', 'offer', 'import'
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policies
-- View: All authenticated users can view customers (shared database)
CREATE POLICY "Users can view all customers" ON customers
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert: Users can create customers
CREATE POLICY "Users can create customers" ON customers
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Update: Users can update customers (maybe restrict to creator or admin later, but for now shared)
CREATE POLICY "Users can update customers" ON customers
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Delete: Only admins can delete customers
CREATE POLICY "Admins can delete customers" ON customers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Migration: Import unique customers from offers
INSERT INTO customers (
    created_at,
    updated_at,
    created_by,
    salutation,
    first_name,
    last_name,
    street,
    house_number,
    postal_code,
    city,
    country,
    phone,
    email,
    source
)
SELECT DISTINCT ON (customer_data->>'email', customer_data->>'phone', customer_data->>'lastName')
    created_at,
    updated_at,
    user_id,
    customer_data->>'salutation',
    customer_data->>'firstName',
    customer_data->>'lastName',
    customer_data->>'street',
    customer_data->>'houseNumber',
    customer_data->>'postalCode',
    customer_data->>'city',
    customer_data->>'country',
    customer_data->>'phone',
    customer_data->>'email',
    'offer'
FROM offers
WHERE customer_data IS NOT NULL;
