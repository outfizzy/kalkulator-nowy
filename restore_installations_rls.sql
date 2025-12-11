-- Restore Installations RLS (Wiped by previous script)

-- 1. Enable RLS
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Installations Policies
-- View: Admins, Managers, Installers (assigned), or Creators
CREATE POLICY "Installations_SELECT" ON public.installations FOR SELECT USING (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')))
  OR (user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.installation_assignments WHERE installation_id = installations.id AND user_id = auth.uid())
);

-- Insert: Any authenticated user (e.g. Sales Rep creating from Contract)
CREATE POLICY "Installations_INSERT" ON public.installations FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Update: Admins, Managers, or Creator
CREATE POLICY "Installations_UPDATE" ON public.installations FOR UPDATE USING (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')))
  OR (user_id = auth.uid())
);

-- Delete: Admins/Managers only
CREATE POLICY "Installations_DELETE" ON public.installations FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);


-- 3. Installation Assignments Policies
-- View: Authenticated (so Sales Reps can see who is assigned)
CREATE POLICY "Assignments_SELECT" ON public.installation_assignments FOR SELECT USING (auth.role() = 'authenticated');

-- Insert/Update/Delete: Admins/Managers only (Assigning installers)
CREATE POLICY "Assignments_MANAGE" ON public.installation_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

NOTIFY pgrst, 'reload config';
