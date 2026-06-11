-- Zaaplikowane na produkcji 2026-06-11 przez MCP (apply_migration: leads_realtime_sources_no_autoassign)

-- 1. Kanban live: tabela leads w publikacji realtime (frontend subskrybuje postgres_changes)
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- 2. Nowe źródła leadów: Messenger (webhook istniał, ale CHECK po cichu odrzucał insert),
--    website_de (badge istnieje w UI), whatsapp i chat (planowane auto-tworzenie leadów)
ALTER TABLE public.leads DROP CONSTRAINT leads_source_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_source_check
  CHECK (source = ANY (ARRAY['email'::text, 'phone'::text, 'website'::text, 'website_pl'::text,
    'targi'::text, 'manual'::text, 'other'::text, 'fair'::text, 'b2b'::text, 'calculator_v2'::text,
    'facebook_messenger'::text, 'website_de'::text, 'whatsapp'::text, 'chat'::text]));

-- 3. Zgodnie z polityką "Never auto-assign" (scan-emails 2026-05-06, commit 4e2d5ba):
--    wyłączamy trigger auto-przypisania do 4 zahardkodowanych handlowców.
--    Odwracalne: ALTER TABLE public.leads ENABLE TRIGGER trigger_auto_assign_lead;
ALTER TABLE public.leads DISABLE TRIGGER trigger_auto_assign_lead;
