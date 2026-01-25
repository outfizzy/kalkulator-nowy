-- =============================================
-- B2B PROMOTIONS, CREDIT APPLICATIONS & ANALYTICS
-- Migration: 20260125230000_b2b_promotions_credit_analytics.sql
-- =============================================

-- Table: b2b_promotions (Akcje promocyjne)
CREATE TABLE IF NOT EXISTS b2b_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    discount_type TEXT CHECK (discount_type IN ('percent', 'fixed', 'bundle', 'free_shipping')) DEFAULT 'percent',
    discount_value DECIMAL(10,2) DEFAULT 0,
    min_order_value DECIMAL(10,2) DEFAULT 0,
    product_categories TEXT[] DEFAULT '{}',
    applies_to_products TEXT[] DEFAULT '{}',
    promo_code TEXT,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ,
    is_featured BOOLEAN DEFAULT false,
    status TEXT CHECK (status IN ('draft', 'active', 'expired', 'cancelled')) DEFAULT 'draft',
    terms_conditions TEXT,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: b2b_credit_applications (Wnioski o kredyt kupiecki)
CREATE TABLE IF NOT EXISTS b2b_credit_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES b2b_partners(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES profiles(id),
    
    -- Requested amount
    requested_amount DECIMAL(12,2) NOT NULL,
    requested_payment_days INTEGER DEFAULT 30,
    
    -- Company information for verification
    company_name TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    registration_number TEXT,
    company_address JSONB DEFAULT '{}',
    
    -- Financial information
    annual_revenue DECIMAL(14,2),
    years_in_business INTEGER,
    number_of_employees INTEGER,
    industry TEXT,
    
    -- Bank information
    bank_name TEXT,
    bank_account_iban TEXT,
    
    -- Contact for credit matters
    credit_contact_name TEXT,
    credit_contact_email TEXT,
    credit_contact_phone TEXT,
    
    -- References
    trade_references JSONB DEFAULT '[]', -- [{company, contact, phone, email}]
    
    -- Documents
    documents JSONB DEFAULT '[]', -- [{name, url, type: 'financial_statement'|'tax_return'|'other'}]
    
    -- Application status
    status TEXT CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled')) DEFAULT 'draft',
    
    -- Decision
    approved_amount DECIMAL(12,2),
    approved_payment_days INTEGER,
    decision_notes TEXT,
    decision_by UUID REFERENCES profiles(id),
    decision_at TIMESTAMPTZ,
    
    -- Validity
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: b2b_partner_activity (Analityka aktywności partnerów)
CREATE TABLE IF NOT EXISTS b2b_partner_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES b2b_partners(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    
    -- Activity type
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'login', 'logout',
        'view_page', 'create_offer', 'edit_offer', 'delete_offer', 'accept_offer',
        'view_order', 'download_material', 'view_promotion',
        'submit_credit_application', 'view_training', 'complete_training',
        'search', 'other'
    )),
    
    -- Details
    page_path TEXT,
    resource_id UUID,
    resource_type TEXT, -- 'offer', 'order', 'material', 'promotion', 'training'
    details JSONB DEFAULT '{}', -- Additional context: search query, product viewed, etc.
    
    -- Session info
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: b2b_partner_stats (Agregowane statystyki partnera)
CREATE TABLE IF NOT EXISTS b2b_partner_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES b2b_partners(id) ON DELETE CASCADE,
    
    -- Period
    stats_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Login stats
    login_count INTEGER DEFAULT 0,
    unique_users_count INTEGER DEFAULT 0,
    total_session_minutes INTEGER DEFAULT 0,
    
    -- Offer stats
    offers_created INTEGER DEFAULT 0,
    offers_value_total DECIMAL(12,2) DEFAULT 0,
    
    -- Order stats
    orders_placed INTEGER DEFAULT 0,
    orders_value_total DECIMAL(12,2) DEFAULT 0,
    
    -- Content engagement
    materials_downloaded INTEGER DEFAULT 0,
    trainings_viewed INTEGER DEFAULT 0,
    promotions_used INTEGER DEFAULT 0,
    
    -- Product preferences (top 5)
    top_products JSONB DEFAULT '[]', -- [{product_name, count, value}]
    top_categories JSONB DEFAULT '[]',
    
    -- Page views
    most_visited_pages JSONB DEFAULT '[]', -- [{page, views}]
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(partner_id, stats_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_b2b_promotions_status ON b2b_promotions(status);
CREATE INDEX IF NOT EXISTS idx_b2b_promotions_dates ON b2b_promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_b2b_promotions_featured ON b2b_promotions(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_b2b_credit_applications_partner ON b2b_credit_applications(partner_id);
CREATE INDEX IF NOT EXISTS idx_b2b_credit_applications_status ON b2b_credit_applications(status);

CREATE INDEX IF NOT EXISTS idx_b2b_partner_activity_partner ON b2b_partner_activity(partner_id);
CREATE INDEX IF NOT EXISTS idx_b2b_partner_activity_type ON b2b_partner_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_b2b_partner_activity_created ON b2b_partner_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_b2b_partner_activity_user ON b2b_partner_activity(user_id);

CREATE INDEX IF NOT EXISTS idx_b2b_partner_stats_partner_date ON b2b_partner_stats(partner_id, stats_date);

-- RLS Policies
ALTER TABLE b2b_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_credit_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_partner_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_partner_stats ENABLE ROW LEVEL SECURITY;

-- Promotions: Everyone can read active, admins can manage
CREATE POLICY "Active promotions visible to all authenticated" ON b2b_promotions
    FOR SELECT TO authenticated
    USING (status = 'active' AND (end_date IS NULL OR end_date > now()));

CREATE POLICY "Admins manage promotions" ON b2b_promotions
    FOR ALL TO authenticated
    USING (is_b2b_admin_or_manager());

-- Credit applications: Partner sees own, admins see all
CREATE POLICY "Partners view own credit applications" ON b2b_credit_applications
    FOR SELECT TO authenticated
    USING (partner_id = get_user_partner_id() OR is_b2b_admin_or_manager());

CREATE POLICY "Partners create credit applications" ON b2b_credit_applications
    FOR INSERT TO authenticated
    WITH CHECK (partner_id = get_user_partner_id());

CREATE POLICY "Partners update own draft applications" ON b2b_credit_applications
    FOR UPDATE TO authenticated
    USING (partner_id = get_user_partner_id() AND status = 'draft');

CREATE POLICY "Admins manage credit applications" ON b2b_credit_applications
    FOR ALL TO authenticated
    USING (is_b2b_admin_or_manager());

-- Activity: Partners see own, admins see all
CREATE POLICY "Partners view own activity" ON b2b_partner_activity
    FOR SELECT TO authenticated
    USING (partner_id = get_user_partner_id() OR is_b2b_admin_or_manager());

CREATE POLICY "System inserts activity" ON b2b_partner_activity
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins view all activity" ON b2b_partner_activity
    FOR SELECT TO authenticated
    USING (is_b2b_admin_or_manager());

-- Stats: Same as activity
CREATE POLICY "Partners view own stats" ON b2b_partner_stats
    FOR SELECT TO authenticated
    USING (partner_id = get_user_partner_id() OR is_b2b_admin_or_manager());

CREATE POLICY "System manages stats" ON b2b_partner_stats
    FOR ALL TO authenticated
    USING (is_b2b_admin_or_manager());

-- Triggers for updated_at
CREATE TRIGGER set_b2b_promotions_updated_at
    BEFORE UPDATE ON b2b_promotions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_b2b_credit_applications_updated_at
    BEFORE UPDATE ON b2b_credit_applications
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_b2b_partner_stats_updated_at
    BEFORE UPDATE ON b2b_partner_stats
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
