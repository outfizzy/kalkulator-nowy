-- B2B Partner Portal Schema
-- Migration: 20260126000000_create_b2b_schema.sql

-- =====================================================
-- Table: b2b_partners
-- Main partner company records with pricing and terms
-- =====================================================
CREATE TABLE IF NOT EXISTS b2b_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    tax_id TEXT,
    address JSONB DEFAULT '{}',
    
    -- Account management
    account_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Pricing terms
    margin_percent NUMERIC(5,2) DEFAULT 0, -- Partner markup from base prices
    payment_terms_days INTEGER DEFAULT 14,
    credit_limit NUMERIC(12,2) DEFAULT 0,
    credit_used NUMERIC(12,2) DEFAULT 0,
    
    -- Prepayment settings
    prepayment_required BOOLEAN DEFAULT true,
    prepayment_percent NUMERIC(5,2) DEFAULT 50,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: b2b_partner_users
-- Links user profiles to partner companies with roles
-- =====================================================
CREATE TABLE IF NOT EXISTS b2b_partner_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES b2b_partners(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Role within partner organization
    role TEXT DEFAULT 'sales' CHECK (role IN ('admin', 'sales', 'viewer')),
    
    -- Permissions
    can_place_orders BOOLEAN DEFAULT true,
    can_view_invoices BOOLEAN DEFAULT true,
    can_manage_users BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(partner_id, user_id)
);

-- =====================================================
-- Table: b2b_offers
-- Partner offers to their end customers
-- =====================================================
CREATE TABLE IF NOT EXISTS b2b_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES b2b_partners(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Reference
    reference_number TEXT,
    customer_name TEXT,
    customer_contact JSONB DEFAULT '{}', -- {email, phone, address}
    
    -- Offer content (from calculator)
    items JSONB DEFAULT '[]',
    notes TEXT,
    
    -- Pricing
    base_total NUMERIC(12,2) DEFAULT 0,      -- Your cost (hidden from partner)
    partner_total NUMERIC(12,2) DEFAULT 0,   -- Partner's price (with their margin)
    currency TEXT DEFAULT 'EUR',
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'saved', 'accepted', 'expired', 'cancelled')),
    valid_until DATE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for reference number search
CREATE INDEX IF NOT EXISTS idx_b2b_offers_reference ON b2b_offers(reference_number);
CREATE INDEX IF NOT EXISTS idx_b2b_offers_partner ON b2b_offers(partner_id);

-- =====================================================
-- Table: b2b_orders
-- Orders created from accepted offers
-- =====================================================
CREATE TABLE IF NOT EXISTS b2b_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID REFERENCES b2b_offers(id) ON DELETE SET NULL,
    partner_id UUID NOT NULL REFERENCES b2b_partners(id) ON DELETE CASCADE,
    
    -- Order number (auto-generated)
    order_number TEXT UNIQUE,
    
    -- Status workflow
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Awaiting admin approval
        'approved',          -- Approved by admin
        'rejected',          -- Rejected by admin
        'awaiting_payment',  -- Waiting for prepayment
        'in_production',     -- Being manufactured
        'shipped',           -- Sent to partner
        'delivered',         -- Confirmed delivery
        'cancelled'          -- Cancelled
    )),
    
    -- Approval tracking
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Financials
    total_amount NUMERIC(12,2) DEFAULT 0,
    prepayment_amount NUMERIC(12,2) DEFAULT 0,
    prepayment_status TEXT DEFAULT 'not_required' CHECK (prepayment_status IN ('not_required', 'pending', 'paid')),
    currency TEXT DEFAULT 'EUR',
    
    -- Delivery
    estimated_delivery DATE,
    tracking_number TEXT,
    shipping_address JSONB,
    
    -- Notes
    partner_notes TEXT,
    internal_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_orders_partner ON b2b_orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_status ON b2b_orders(status);

-- =====================================================
-- Table: b2b_invoices
-- Invoices linked to orders
-- =====================================================
CREATE TABLE IF NOT EXISTS b2b_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES b2b_orders(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES b2b_partners(id) ON DELETE CASCADE,
    
    invoice_number TEXT,
    type TEXT DEFAULT 'prepayment' CHECK (type IN ('prepayment', 'final', 'correction')),
    
    -- Amounts
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    
    -- Payment tracking
    due_date DATE,
    paid_at TIMESTAMPTZ,
    payment_reference TEXT,
    
    -- Document
    pdf_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_invoices_order ON b2b_invoices(order_id);

-- =====================================================
-- Table: b2b_order_timeline
-- Order status history for tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS b2b_order_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES b2b_orders(id) ON DELETE CASCADE,
    
    status TEXT NOT NULL,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_timeline_order ON b2b_order_timeline(order_id);

-- =====================================================
-- Function: Generate B2B order number
-- =====================================================
CREATE OR REPLACE FUNCTION generate_b2b_order_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    sequence_num INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(order_number FROM 'B2B-' || year_part || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM b2b_orders
    WHERE order_number LIKE 'B2B-' || year_part || '-%';
    
    NEW.order_number := 'B2B-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generating order numbers
DROP TRIGGER IF EXISTS trigger_generate_b2b_order_number ON b2b_orders;
CREATE TRIGGER trigger_generate_b2b_order_number
    BEFORE INSERT ON b2b_orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL)
    EXECUTE FUNCTION generate_b2b_order_number();

-- =====================================================
-- Function: Auto-create timeline entry on status change
-- =====================================================
CREATE OR REPLACE FUNCTION b2b_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO b2b_order_timeline (order_id, status, changed_by)
        VALUES (NEW.id, NEW.status, auth.uid());
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_b2b_order_status_change ON b2b_orders;
CREATE TRIGGER trigger_b2b_order_status_change
    BEFORE UPDATE ON b2b_orders
    FOR EACH ROW
    EXECUTE FUNCTION b2b_order_status_change();

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE b2b_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_partner_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_order_timeline ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'b2b_manager')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get user's partner ID
CREATE OR REPLACE FUNCTION get_user_partner_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT partner_id FROM b2b_partner_users
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- b2b_partners policies
CREATE POLICY "Admins can manage all partners"
    ON b2b_partners FOR ALL
    USING (is_admin_or_manager());

CREATE POLICY "Partners can view own company"
    ON b2b_partners FOR SELECT
    USING (id = get_user_partner_id());

-- b2b_partner_users policies
CREATE POLICY "Admins can manage partner users"
    ON b2b_partner_users FOR ALL
    USING (is_admin_or_manager());

CREATE POLICY "Partners can view own team"
    ON b2b_partner_users FOR SELECT
    USING (partner_id = get_user_partner_id());

-- b2b_offers policies
CREATE POLICY "Admins can manage all offers"
    ON b2b_offers FOR ALL
    USING (is_admin_or_manager());

CREATE POLICY "Partners can manage own offers"
    ON b2b_offers FOR ALL
    USING (partner_id = get_user_partner_id());

-- b2b_orders policies
CREATE POLICY "Admins can manage all orders"
    ON b2b_orders FOR ALL
    USING (is_admin_or_manager());

CREATE POLICY "Partners can view own orders"
    ON b2b_orders FOR SELECT
    USING (partner_id = get_user_partner_id());

CREATE POLICY "Partners can create orders"
    ON b2b_orders FOR INSERT
    WITH CHECK (partner_id = get_user_partner_id());

-- b2b_invoices policies
CREATE POLICY "Admins can manage all invoices"
    ON b2b_invoices FOR ALL
    USING (is_admin_or_manager());

CREATE POLICY "Partners can view own invoices"
    ON b2b_invoices FOR SELECT
    USING (partner_id = get_user_partner_id());

-- b2b_order_timeline policies
CREATE POLICY "Admins can manage timeline"
    ON b2b_order_timeline FOR ALL
    USING (is_admin_or_manager());

CREATE POLICY "Partners can view own order timeline"
    ON b2b_order_timeline FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM b2b_orders WHERE partner_id = get_user_partner_id()
        )
    );

-- =====================================================
-- Update profiles role constraint to include b2b roles
-- =====================================================
DO $$
BEGIN
    -- First check if constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_role_check' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
    END IF;
    
    -- Add new constraint with B2B roles
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('admin', 'sales_rep', 'technician', 'installer', 'b2b_manager', 'b2b_partner'));
EXCEPTION
    WHEN others THEN
        -- If constraint doesn't exist or can't be modified, skip
        RAISE NOTICE 'Could not update role constraint: %', SQLERRM;
END $$;

-- =====================================================
-- Updated_at trigger for all B2B tables
-- =====================================================
CREATE OR REPLACE FUNCTION update_b2b_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_b2b_partners_updated ON b2b_partners;
CREATE TRIGGER trigger_b2b_partners_updated
    BEFORE UPDATE ON b2b_partners
    FOR EACH ROW EXECUTE FUNCTION update_b2b_updated_at();

DROP TRIGGER IF EXISTS trigger_b2b_offers_updated ON b2b_offers;
CREATE TRIGGER trigger_b2b_offers_updated
    BEFORE UPDATE ON b2b_offers
    FOR EACH ROW EXECUTE FUNCTION update_b2b_updated_at();
