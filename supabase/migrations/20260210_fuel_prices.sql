-- Create fuel_prices table for managing fuel price periods
CREATE TABLE IF NOT EXISTS fuel_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_per_liter NUMERIC NOT NULL CHECK (price_per_liter > 0),
    valid_from DATE NOT NULL,
    valid_to DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint to prevent overlapping periods
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE fuel_prices 
ADD CONSTRAINT no_overlapping_periods 
EXCLUDE USING gist (
    daterange(valid_from, COALESCE(valid_to, 'infinity'::date), '[]') WITH &&
);

-- Enable RLS
ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;

-- Admin and managers can manage fuel prices
CREATE POLICY "Admin and managers can manage fuel prices" ON fuel_prices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Everyone can read prices (needed for auto-calculation)
CREATE POLICY "Everyone can read fuel prices" ON fuel_prices
    FOR SELECT USING (true);

-- Function to calculate fuel cost based on price periods
CREATE OR REPLACE FUNCTION calculate_fuel_cost()
RETURNS TRIGGER AS $$
DECLARE
    fuel_price NUMERIC;
BEGIN
    -- Get price for the log date
    SELECT price_per_liter INTO fuel_price
    FROM fuel_prices
    WHERE NEW.log_date::date >= valid_from 
    AND (valid_to IS NULL OR NEW.log_date::date <= valid_to)
    ORDER BY valid_from DESC
    LIMIT 1;
    
    -- If price found, calculate cost
    IF fuel_price IS NOT NULL THEN
        NEW.cost := NEW.liters * fuel_price;
    ELSE
        -- Keep existing cost or set to 0
        NEW.cost := COALESCE(NEW.cost, 0);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate cost on insert/update
DROP TRIGGER IF EXISTS auto_calculate_fuel_cost ON fuel_logs;
CREATE TRIGGER auto_calculate_fuel_cost
    BEFORE INSERT OR UPDATE OF liters, log_date ON fuel_logs
    FOR EACH ROW
    EXECUTE FUNCTION calculate_fuel_cost();

-- Add comments
COMMENT ON TABLE fuel_prices IS 'Fuel price periods for automatic cost calculation';
COMMENT ON COLUMN fuel_prices.price_per_liter IS 'Price per liter in PLN';
COMMENT ON COLUMN fuel_prices.valid_from IS 'Start date of price validity';
COMMENT ON COLUMN fuel_prices.valid_to IS 'End date of price validity (NULL = ongoing)';
