-- ═══════════════════════════════════════════════════════════════
-- AI Ads Manager — Database Schema
-- zadaszto.pl Google Ads management module
-- ═══════════════════════════════════════════════════════════════

-- 1. Business configuration
CREATE TABLE IF NOT EXISTS ads_business_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'zadaszto.pl',
  monthly_budget_pln INTEGER NOT NULL DEFAULT 10000,
  max_cpl_pln INTEGER NOT NULL DEFAULT 250,
  target_roas DECIMAL DEFAULT 4.0,
  allowed_customer_ids TEXT[] NOT NULL DEFAULT ARRAY['8950548907'],
  regions TEXT[] DEFAULT ARRAY['lubuskie','zachodniopomorskie','wielkopolskie','dolnośląskie','śląskie'],
  top_products JSONB DEFAULT '[{"name":"Pergola Deluxe","priority":1},{"name":"Zadaszenie tarasu","priority":2},{"name":"Carport aluminiowy","priority":3}]'::jsonb,
  working_hours JSONB DEFAULT '{"days":"pn-pt","start":"08:00","end":"18:00"}'::jsonb,
  brand_voice TEXT DEFAULT 'Profesjonalny, ekspercki, ale przystępny. Zadaszto.pl to premium zadaszenia aluminiowe w Polsce.',
  competitors JSONB DEFAULT '[]'::jsonb,
  autonomy_level TEXT DEFAULT 'semi_auto',
  emergency_stop BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ads accounts
CREATE TABLE IF NOT EXISTS ads_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT DEFAULT 'google_ads',
  customer_id TEXT UNIQUE NOT NULL,
  mcc_id TEXT,
  currency TEXT DEFAULT 'PLN',
  timezone TEXT DEFAULT 'Europe/Warsaw',
  account_name TEXT,
  status TEXT DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Campaigns snapshot
CREATE TABLE IF NOT EXISTS ads_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES ads_accounts(id) ON DELETE CASCADE,
  google_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  status TEXT,
  daily_budget_pln DECIMAL,
  bidding_strategy TEXT,
  target_cpa_pln DECIMAL,
  start_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, google_campaign_id)
);

-- 4. Ad groups
CREATE TABLE IF NOT EXISTS ads_ad_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE CASCADE,
  google_ad_group_id TEXT NOT NULL,
  name TEXT,
  status TEXT,
  default_cpc DECIMAL,
  UNIQUE(campaign_id, google_ad_group_id)
);

-- 5. Keywords
CREATE TABLE IF NOT EXISTS ads_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_group_id UUID REFERENCES ads_ad_groups(id) ON DELETE CASCADE,
  google_keyword_id TEXT,
  text TEXT NOT NULL,
  match_type TEXT,
  status TEXT,
  cpc_bid DECIMAL,
  quality_score INTEGER
);

-- 6. Daily metrics (rolling 90 days)
CREATE TABLE IF NOT EXISTS ads_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost_pln DECIMAL DEFAULT 0,
  conversions DECIMAL DEFAULT 0,
  conv_value_pln DECIMAL DEFAULT 0,
  ctr DECIMAL DEFAULT 0,
  avg_cpc DECIMAL DEFAULT 0,
  roas DECIMAL DEFAULT 0,
  search_impression_share DECIMAL,
  UNIQUE(campaign_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ads_metrics_date ON ads_daily_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_ads_metrics_campaign_date ON ads_daily_metrics(campaign_id, date DESC);

-- 7. AI proposals inbox
CREATE TABLE IF NOT EXISTS ads_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reasoning_full TEXT,
  expected_impact JSONB,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  change_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  rollback_payload JSONB,
  status TEXT DEFAULT 'pending_approval',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  result_after_7d JSONB,
  user_feedback TEXT
);

CREATE INDEX IF NOT EXISTS idx_ads_proposals_status ON ads_proposals(status, created_at DESC);

-- 8. Chat messages
CREATE TABLE IF NOT EXISTS ads_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB,
  related_proposal_id UUID REFERENCES ads_proposals(id) ON DELETE SET NULL,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_chat_session ON ads_chat_messages(session_id, created_at);

-- 9. Knowledge base
CREATE TABLE IF NOT EXISTS ads_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT,
  source_url TEXT,
  title TEXT,
  summary TEXT,
  full_content TEXT,
  tags TEXT[],
  relevance_score DECIMAL,
  learned_at TIMESTAMPTZ DEFAULT NOW(),
  applied_in_proposals UUID[]
);

-- 10. User feedback
CREATE TABLE IF NOT EXISTS ads_user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context TEXT,
  feedback_text TEXT NOT NULL,
  sentiment TEXT,
  related_proposal_id UUID REFERENCES ads_proposals(id) ON DELETE SET NULL,
  applied_to_future BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Experiments
CREATE TABLE IF NOT EXISTS ads_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE SET NULL,
  hypothesis TEXT NOT NULL,
  variant_a JSONB NOT NULL,
  variant_b JSONB NOT NULL,
  start_date DATE,
  end_date DATE,
  winner TEXT,
  confidence_pct DECIMAL,
  learnings TEXT,
  status TEXT DEFAULT 'running'
);

-- 12. Alerts
CREATE TABLE IF NOT EXISTS ads_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE SET NULL,
  action_required BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Audit log
CREATE TABLE IF NOT EXISTS ads_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  payload JSONB,
  success BOOLEAN,
  error_message TEXT,
  triggered_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_audit_date ON ads_audit_log(created_at DESC);

-- ═══ RLS ═══
ALTER TABLE ads_business_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_ad_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access (role check via profiles table)
CREATE OR REPLACE FUNCTION is_ads_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply policies to all tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ads_business_config','ads_accounts','ads_campaigns','ads_ad_groups',
    'ads_keywords','ads_daily_metrics','ads_proposals','ads_chat_messages',
    'ads_knowledge_base','ads_user_feedback','ads_experiments','ads_alerts','ads_audit_log'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "ads_admin_all_%s" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "ads_admin_all_%s" ON %I FOR ALL USING (is_ads_admin()) WITH CHECK (is_ads_admin())', tbl, tbl);
  END LOOP;
END;
$$;

-- Service role bypass for edge functions (cron jobs)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ads_business_config','ads_accounts','ads_campaigns','ads_ad_groups',
    'ads_keywords','ads_daily_metrics','ads_proposals','ads_chat_messages',
    'ads_knowledge_base','ads_user_feedback','ads_experiments','ads_alerts','ads_audit_log'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "ads_service_role_%s" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "ads_service_role_%s" ON %I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')', tbl, tbl);
  END LOOP;
END;
$$;

-- ═══ SEED: Initial config ═══
INSERT INTO ads_business_config (
  company_name, monthly_budget_pln, max_cpl_pln, target_roas,
  allowed_customer_ids, regions, top_products, autonomy_level
) VALUES (
  'zadaszto.pl', 10000, 250, 4.0,
  ARRAY['8950548907'],
  ARRAY['lubuskie','zachodniopomorskie','wielkopolskie','dolnośląskie','śląskie'],
  '[{"name":"Pergola Deluxe","priority":1,"margin":"high"},{"name":"Zadaszenie tarasu","priority":2,"margin":"high"},{"name":"Carport aluminiowy","priority":3,"margin":"medium"},{"name":"Pergola bioklimatyczna","priority":4,"margin":"high"},{"name":"Zabudowa szklana","priority":5,"margin":"medium"}]'::jsonb,
  'semi_auto'
) ON CONFLICT DO NOTHING;

-- Seed account
INSERT INTO ads_accounts (customer_id, mcc_id, account_name, platform)
VALUES ('8950548907', '5467656892', 'zadaszto.pl', 'google_ads')
ON CONFLICT (customer_id) DO NOTHING;
