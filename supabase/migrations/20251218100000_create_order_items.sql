-- Create enum for order item status
CREATE TYPE order_item_status AS ENUM ('pending', 'ordered', 'delivered');

-- Create installation_order_items table
CREATE TABLE IF NOT EXISTS installation_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    installation_id UUID NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'flooring', 'addon', 'custom', 'accessory'
    quantity NUMERIC NOT NULL DEFAULT 1,
    status order_item_status NOT NULL DEFAULT 'pending',
    planned_delivery_date DATE,
    ordered_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_manager_responsible BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE installation_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access for authenticated users" ON installation_order_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all access for authenticated users" ON installation_order_items
    FOR ALL USING (auth.role() = 'authenticated');

-- Create index for faster lookups
CREATE INDEX idx_order_items_installation_id ON installation_order_items(installation_id);
CREATE INDEX idx_order_items_manager_responsible ON installation_order_items(is_manager_responsible) WHERE is_manager_responsible = true;
