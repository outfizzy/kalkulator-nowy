-- ═══════════════════════════════════════════════════════════════
-- AI Ads Manager — Sprint 5: Analytics, Automation, Intelligence
-- ═══════════════════════════════════════════════════════════════

-- 1. GA4 Metrics
CREATE TABLE IF NOT EXISTS ads_ga4_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  bounce_rate DECIMAL DEFAULT 0,
  avg_session_duration DECIMAL DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  source TEXT DEFAULT 'all',
  medium TEXT DEFAULT 'all',
  landing_page TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, source, medium, landing_page)
);

CREATE INDEX IF NOT EXISTS idx_ga4_metrics_date ON ads_ga4_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_metrics_source ON ads_ga4_metrics(source, medium, date DESC);

-- 2. Search Console Metrics
CREATE TABLE IF NOT EXISTS ads_search_console_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  query TEXT NOT NULL,
  page TEXT,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL DEFAULT 0,
  position DECIMAL DEFAULT 0,
  country TEXT DEFAULT 'pol',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gsc_unique_query ON ads_search_console_metrics(date, query, COALESCE(page, ''));

CREATE INDEX IF NOT EXISTS idx_gsc_date ON ads_search_console_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_query ON ads_search_console_metrics(query, date DESC);

-- 3. RLS
ALTER TABLE ads_ga4_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_search_console_metrics ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['ads_ga4_metrics','ads_search_console_metrics'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "ads_admin_all_%s" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "ads_admin_all_%s" ON %I FOR ALL USING (is_ads_admin()) WITH CHECK (is_ads_admin())', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "ads_service_role_%s" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "ads_service_role_%s" ON %I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')', tbl, tbl);
  END LOOP;
END;
$$;

-- 4. Add impact measurement fields to proposals if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads_proposals' AND column_name = 'impact_measured_at') THEN
    ALTER TABLE ads_proposals ADD COLUMN impact_measured_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads_proposals' AND column_name = 'impact_verdict') THEN
    ALTER TABLE ads_proposals ADD COLUMN impact_verdict TEXT; -- positive, neutral, negative
  END IF;
END;
$$;

-- 5. Cron schedules (pg_cron + pg_net)
-- NOTE: These must be run by the Supabase dashboard or as superuser
-- They call edge functions via pg_net HTTP extension

-- Enable extensions if not already
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: Get edge function invoke URL
CREATE OR REPLACE FUNCTION _ads_edge_url(fn_name TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/' || fn_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper: Get service role key from vault (or use env)
-- We'll use the CRON_SECRET approach instead for security

-- Schedule: ads-sync every hour at :00
SELECT cron.schedule(
  'ads-sync-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule: ads-analyze every 6 hours at :15
SELECT cron.schedule(
  'ads-analyze-6h',
  '15 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-analyze',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule: ads-execute every hour at :30
SELECT cron.schedule(
  'ads-execute-hourly',
  '30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-execute',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule: ads-daily-briefing at 7:30 CET = 5:30 UTC
SELECT cron.schedule(
  'ads-briefing-daily',
  '30 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-daily-briefing',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule: ads-ga4-sync every 4 hours at :45
SELECT cron.schedule(
  'ads-ga4-sync-4h',
  '45 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-ga4-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule: ads-gsc-sync daily at 6:00 UTC (8:00 CET)
SELECT cron.schedule(
  'ads-gsc-sync-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-gsc-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule: ads-measure-impact daily at 8:00 CET = 6:00 UTC
SELECT cron.schedule(
  'ads-impact-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-measure-impact',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
