-- ═══════════════════════════════════════════════════════
-- Cron jobs dla AI Ads Manager
-- Core agents (Sprint 1-4) + Sprint 6 autonomy
-- ═══════════════════════════════════════════════════════

-- ─── CORE AGENTS (Sprint 1-4) ───────────────────────

-- 1. ads-sync — co 1 godzinę
-- Pobiera dane z Google Ads API → Supabase
SELECT cron.schedule(
  'ads-sync',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2. ads-analyze — co 6 godzin (00:00, 06:00, 12:00, 18:00 UTC)
-- Detekcja anomalii + propozycje AI (Claude)
SELECT cron.schedule(
  'ads-analyze',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-analyze',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 3. ads-execute — co 1 godzinę
-- Wdraża zatwierdzone propozycje z guardrails
SELECT cron.schedule(
  'ads-execute',
  '30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-execute',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 4. ads-daily-briefing — codziennie o 05:30 UTC (07:30 PL)
-- Raport poranny z Claude
SELECT cron.schedule(
  'ads-daily-briefing',
  '30 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-daily-briefing',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ─── SPRINT 6: AUTONOMY AGENTS ──────────────────────

-- 5. ads-optimizer — codziennie o 06:00 UTC (08:00 PL)
-- "mózg" optymalizacji: grading, budget realloc, sezonowość
SELECT cron.schedule(
  'ads-optimizer',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-optimizer',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 6. ads-competitor-intel — co poniedziałek o 04:00 UTC (06:00 PL)
-- scraping 7 konkurentów, wykrywanie zmian, counter-proposals
SELECT cron.schedule(
  'ads-competitor-intel',
  '0 4 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-competitor-intel',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 7. ads-weekly-report — co poniedziałek o 07:00 UTC (09:00 PL)
-- executive summary z danych WSZYSTKICH agentów
SELECT cron.schedule(
  'ads-weekly-report',
  '0 7 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/ads-weekly-report',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ═══ VERIFICATION ═══
-- Pokaż WSZYSTKIE aktywne cron joby
SELECT jobid, jobname, schedule, active 
FROM cron.job 
ORDER BY jobname;

