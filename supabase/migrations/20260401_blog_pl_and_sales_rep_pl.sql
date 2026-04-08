-- ═══ Blog Posts PL Table ═══
CREATE TABLE IF NOT EXISTS blog_posts_pl (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL DEFAULT '',
  excerpt text DEFAULT '',
  image_url text,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  meta_title text DEFAULT '',
  meta_description text DEFAULT '',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE blog_posts_pl ENABLE ROW LEVEL SECURITY;

-- Published posts viewable by everyone (for public API)
CREATE POLICY "Published blog_posts_pl viewable by all" ON blog_posts_pl
  FOR SELECT USING (is_published = true);

-- Admin and sales_rep_pl full access
CREATE POLICY "Admin and sales_rep_pl full access to blog_posts_pl" ON blog_posts_pl
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'sales_rep_pl')
    )
  );

-- ═══ Permissions Seeding for sales_rep_pl ═══
INSERT INTO module_permissions (module_key, role, is_enabled)
VALUES
  ('dashboard', 'sales_rep_pl', true),
  ('crm_leads', 'sales_rep_pl', true),
  ('crm_clients', 'sales_rep_pl', true),
  ('crm_mail', 'sales_rep_pl', true),
  ('crm_tasks', 'sales_rep_pl', true),
  ('offers_create', 'sales_rep_pl', true),
  ('offers_list', 'sales_rep_pl', true),
  ('installations_calendar', 'sales_rep_pl', true),
  ('measurement_reports', 'sales_rep_pl', true),
  ('blog_pl', 'sales_rep_pl', true),
  ('blog_pl', 'admin', true)
ON CONFLICT (module_key, role) DO UPDATE SET is_enabled = true;

-- ═══ Default Exchange Rate ═══
INSERT INTO app_settings (key, value, updated_at)
VALUES ('eur_rate', '{"rate": 4.35}', now())
ON CONFLICT (key) DO NOTHING;
