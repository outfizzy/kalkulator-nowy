-- ═══════════════════════════════════════════════════════════════
-- AI Ads Manager — SEED DATA
-- Dane startowe: 10 kampanii, konfiguracja, baza wiedzy
-- Uruchom w Supabase SQL Editor PO sprint5 & sprint6 migracjach
-- ═══════════════════════════════════════════════════════════════

-- ═══ 1. KONFIGURACJA BIZNESOWA ═══
INSERT INTO ads_business_config (
  company_name, website_url, monthly_budget_pln, max_cpl_pln,
  target_roas, regions, top_products, autonomy_level, emergency_stop
) VALUES (
  'ZadaszTo.pl',
  'https://zadaszto.pl',
  6000,
  200,
  5.0,
  '["cała Polska","Warszawa","Kraków","Wrocław","Poznań","Gdańsk","Katowice","Łódź","Szczecin","Lublin","Rzeszów","Toruń","Bydgoszcz","Częstochowa","Białystok","Gdynia"]'::jsonb,
  '[
    {"name":"Pergola Bioklimatyczna","priority":1,"margin":"high"},
    {"name":"Pergola Deluxe (Smart)","priority":2,"margin":"premium"},
    {"name":"Trendstyle","priority":3,"margin":"medium"},
    {"name":"Topstyle","priority":4,"margin":"medium"},
    {"name":"Ultrastyle","priority":5,"margin":"high"},
    {"name":"Designstyle","priority":6,"margin":"premium"},
    {"name":"Carport","priority":7,"margin":"medium"},
    {"name":"Skystyle (HoReCa)","priority":8,"margin":"premium"}
  ]'::jsonb,
  'low',
  false
) ON CONFLICT DO NOTHING;

-- ═══ 2. KONTO GOOGLE ADS ═══
INSERT INTO ads_accounts (
  google_customer_id, account_name, currency, timezone, last_sync_at
) VALUES (
  'PENDING_SETUP',
  'ZadaszTo.pl — Google Ads',
  'PLN',
  'Europe/Warsaw',
  NOW()
) ON CONFLICT DO NOTHING;

-- ═══ 3. 10 KAMPANII z BLUEPRINTU ═══
INSERT INTO ads_campaigns (google_campaign_id, name, type, status, daily_budget_pln, bidding_strategy, target_cpa_pln) VALUES
  ('camp_brand',      '[BRAND] zadaszto',                'SEARCH', 'ENABLED',  20,  'MANUAL_CPC',          5),
  ('camp_pergole',    '[PERGOLE] Pergole bioklimatyczne', 'SEARCH', 'ENABLED',  100, 'MAXIMIZE_CONVERSIONS', 150),
  ('camp_zadaszenia', '[ZADASZENIA] Zadaszenia tarasów',  'SEARCH', 'ENABLED',  80,  'MAXIMIZE_CONVERSIONS', 180),
  ('camp_carport',    '[CARPORT] Wiaty aluminiowe',       'SEARCH', 'ENABLED',  40,  'MAXIMIZE_CLICKS',     200),
  ('camp_zabudowy',   '[ZABUDOWY] Zabudowy szklane',      'SEARCH', 'ENABLED',  50,  'MAXIMIZE_CONVERSIONS', 250),
  ('camp_horeca',     '[HORECA] Gastronomia & Hotele',    'SEARCH', 'ENABLED',  40,  'MANUAL_CPC',          300),
  ('camp_lokalne',    '[LOKALNE] Frazy z miastami',       'SEARCH', 'ENABLED',  50,  'MAXIMIZE_CONVERSIONS', 150),
  ('camp_competitor', '[COMPETITOR] Frazy konkurencji',   'SEARCH', 'ENABLED',  30,  'MANUAL_CPC',          200),
  ('camp_dodatki',    '[DODATKI] Cross-sell akcesoria',   'SEARCH', 'ENABLED',  20,  'MAXIMIZE_CLICKS',     150),
  ('camp_designstyle','[DESIGNSTYLE] Dach przesuwny',     'SEARCH', 'ENABLED',  25,  'MANUAL_CPC',          250)
ON CONFLICT DO NOTHING;

-- ═══ 4. BAZA WIEDZY — dane startowe ═══

-- Wiedza o produktach
INSERT INTO ads_knowledge_base (title, summary, tags, source_type, relevance_score) VALUES
(
  '🏢 Produkty zadaszto.pl — katalog',
  E'PEŁNA OFERTA PRODUKTOWA:\n\n1. Trendstyle — zadaszenie tarasowe (entry level), szkło VSG/poliwęglan, od ~15k PLN\n2. Topstyle — zadaszenie premium, wzmocnione profile, do 6m głębokości\n3. Ultrastyle — płaski dach nowoczesny, minimalistyczny design, aluminium serii 6000\n4. Designstyle — PRZESUWNY dach szklany (unikat!), szkło się otwiera\n5. Pergola — bioklimatyczna lamele 0-180°, ręczna lub pilot SOMFY\n6. Pergola Deluxe — SMART: app mobilna, czujniki pogodowe, LED, audio, ogrzewanie\n7. Carport — wiata garażowa aluminiowa, do 50m² bez pozwolenia, gotowa pod PV\n8. Skystyle — dedykowana linia HoReCa, segment 60-150k PLN\n\nDODATKI: markizy ZIP, markizy naddachowe, szyby przesuwne, ściany panoramiczne, SteelLook, panele osłonowe, oświetlenie LED, ogrzewanie',
  ARRAY['produkty', 'katalog', 'oferta'],
  'internal',
  1.0
),
(
  '💰 Widełki cenowe zadaszto.pl',
  E'ORIENTACYJNE CENY (zależne od wymiarów i konfiguracji):\n\n- Trendstyle 3x3m: od 15.000 PLN\n- Topstyle 5x3.5m: od 25.000 PLN\n- Ultrastyle 5x4m: od 30.000 PLN\n- Designstyle 4x3m: od 35.000 PLN\n- Pergola bioklimatyczna 4x3m: od 18.000 PLN\n- Pergola Deluxe 5x4m: od 35.000 PLN\n- Carport na 1 auto: od 15.000 PLN\n- Carport na 2 auta: od 25.000 PLN\n- Skystyle HoReCa: od 60.000 PLN (projekt indywidualny)\n\nŚREDNIA WARTOŚĆ ZAMÓWIENIA: ~35.000 PLN\nMONTAŻ: wliczony w cenę, własne ekipy\nGWARANCJA: 10 lat na konstrukcję',
  ARRAY['ceny', 'pricing', 'aov'],
  'internal',
  1.0
),
(
  '🕵️ Analiza konkurencji — 7 firm',
  E'RANKING ZAGROŻEŃ:\n🔴 TWIGO (twigo.pl) — Wrocław, ISO 9001, od 11k PLN, eksport\n🔴 Zabudowy Tarasu/ESKA (zabudowytarasu.pl) — od 1993, konfigurator, 11 miast SEO\n🟠 AMPERGOLA (ampergola.pl) — Śląsk, baseny, anodowane alu\n🟠 APLO (aplo.com.pl) — Warszawa, 10 modeli, HoReCa\n🟡 ALUBOSS (aluboss.pl) — ceny jawne, sklep online\n🟡 Krajewski (krajewski.pl) — Gliwice, showroom, 16 kategorii\n🟢 Tarasy4U (tarasy4u.pl) — mała firma, brak automatyki\n\nNASZ MOAT: (1) Konfigurator 3D, (2) Smart sterowanie, (3) CE DIN EN 1090, (4) 10 lat gwarancji, (5) 8 modeli, (6) Skystyle HoReCa, (7) Designstyle przesuwny dach, (8) 35+ RAL',
  ARRAY['konkurencja', 'competitive-intel', 'moat'],
  'competitor_analysis',
  0.95
),
(
  '📊 Sezonowość branży — mnożniki budżetu',
  E'SEZONOWOŚĆ PERGOLE/ZADASZENIA w Polsce:\n\nSty: 0.5x (planowanie)\nLut: 0.6x (early bird)\nMAR: 1.2x ← START SEZONU\nKWI: 1.5x ← SZCZYT\nMAJ: 1.5x ← SZCZYT\nCZE: 1.3x (realizacje)\nLip: 1.0x (wakacje)\nSie: 0.9x (koniec lata)\nWrz: 0.8x (jesień)\nPaź: 0.6x (off-season start)\nLis: 0.5x (zimowy spokój)\nGru: 0.4x (minimum)\n\nKLUCZOWE: Kampanie skalować agresywnie Mar-Cze, minimalizować Lis-Gru.',
  ARRAY['sezonowość', 'budżet', 'strategia'],
  'internal',
  0.9
),
(
  '🎯 Setup konwersji Google Ads',
  E'WYMAGANE CONVERSION TRACKING:\n\nPrimary conversions (optymalizacja):\n1. Formularz kontaktowy → /kontakt.html → wartość 35.000 PLN\n2. Kliknięcie tel: +48 533 459 475 → wartość 35.000 PLN\n\nSecondary conversions (informacyjne):\n3. Otwarcie konfiguratora 3D → wartość 5.000 PLN\n\nObservation only:\n4. Scroll 75%+ na stronie produktu\n\nTO-DO: Zainstalować Google Tag na zadaszto.pl (gtag.js lub GTM)\nKontakt w sprawie zadaszto.pl: +48 533 459 475',
  ARRAY['konwersje', 'tracking', 'setup'],
  'internal',
  0.85
),
(
  '🏗️ Landing pages — mapowanie',
  E'ROUTING REKLAM → LANDING PAGE:\n\n"pergola bioklimatyczna" → /produkty/pergola.html\n"pergola deluxe/smart" → /produkty/pergola-deluxe.html\n"zadaszenie tarasu" ogólne → /produkty/trendstyle.html (entry point)\n"nowoczesne zadaszenie" → /produkty/ultrastyle.html\n"szklane zadaszenie" → /produkty/designstyle.html\n"premium zadaszenie" → /produkty/topstyle.html\n"carport" → /produkty/carport.html\n"zabudowa restauracji" → /produkty/skystyle.html\n\n⛔ NIGDY na stronę główną — zawsze na dedykowaną stronę produktu!\nKontakt: /kontakt.html\nKonfigurator: /index.html#konfigurator',
  ARRAY['landing-pages', 'routing', 'konwersje'],
  'internal',
  0.9
);

-- ═══ 5. STARTOWY ALERT ═══
INSERT INTO ads_alerts (severity, type, message, action_required) VALUES
(
  'info',
  'system_init',
  '🚀 AI Ads Manager zostął zainicjalizowany z 10 kampaniami startowymi, bazą wiedzy konkurencji i konfiguracją. System jest gotowy do pracy! Następny krok: podłącz Google Ads API (Customer ID) w zakładce Settings.',
  true
);

-- ═══ 6. INITIAL PROPOSAL ═══
INSERT INTO ads_proposals (title, description, type, risk_level, status, reasoning_full, source) VALUES
(
  '🚀 Uruchomienie kampanii startowych',
  'System został zainicjalizowany z 10 kampaniami zgodnymi z blueprintem. Całkowity budżet dzienny: 455 PLN (~13.650 PLN/mies.). Rekomendacja: potwierdź budżet i podłącz Google Ads API, aby rozpocząć synchronizację i optymalizację.',
  'campaign_create',
  'low',
  'pending_approval',
  '[System Init] 10 kampanii z blueprintu: BRAND(20), PERGOLE(100), ZADASZENIA(80), CARPORT(40), ZABUDOWY(50), HORECA(40), LOKALNE(50), COMPETITOR(30), DODATKI(20), DESIGNSTYLE(25). Łącznie 455 PLN/dzień. Sezon kwiecień = mnożnik 1.5x = docelowo ~680 PLN/dzień.',
  'system_init'
);

-- ═══ VERIFICATION ═══
SELECT 'ads_business_config' as tabela, count(*) as cnt FROM ads_business_config
UNION ALL SELECT 'ads_accounts', count(*) FROM ads_accounts
UNION ALL SELECT 'ads_campaigns', count(*) FROM ads_campaigns
UNION ALL SELECT 'ads_knowledge_base', count(*) FROM ads_knowledge_base
UNION ALL SELECT 'ads_alerts', count(*) FROM ads_alerts
UNION ALL SELECT 'ads_proposals', count(*) FROM ads_proposals
ORDER BY tabela;
