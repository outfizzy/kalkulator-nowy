-- ═══════════════════════════════════════════════
-- Create max_chat_settings table
-- Stores AI chat widget configuration (single-row)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS max_chat_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_greeting TEXT NOT NULL DEFAULT 'Hallo! Ich bin Max, Ihr persoenlicher Berater fuer Terrassenueberdachungen. Wie kann ich Ihnen helfen?',
  widget_accent_color VARCHAR(20) NOT NULL DEFAULT '#2563EB',
  widget_position VARCHAR(20) NOT NULL DEFAULT 'bottom-right',
  working_hours_start TIME NOT NULL DEFAULT '08:00',
  working_hours_end TIME NOT NULL DEFAULT '20:00',
  outside_hours_message TEXT NOT NULL DEFAULT 'Wir sind gerade nicht erreichbar. Hinterlassen Sie uns Ihre Kontaktdaten und wir melden uns schnellstmoeglich bei Ihnen!',
  auto_quote_enabled BOOLEAN NOT NULL DEFAULT true,
  personality VARCHAR(30) NOT NULL DEFAULT 'freundlich',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE max_chat_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Allow authenticated read max_chat_settings"
  ON max_chat_settings FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert/update settings
CREATE POLICY "Allow authenticated write max_chat_settings"
  ON max_chat_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update max_chat_settings"
  ON max_chat_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default row
INSERT INTO max_chat_settings (
  widget_greeting,
  widget_accent_color,
  widget_position,
  working_hours_start,
  working_hours_end,
  outside_hours_message,
  auto_quote_enabled,
  personality
) VALUES (
  'Hallo! Ich bin Max, Ihr persoenlicher Berater fuer Terrassenueberdachungen. Wie kann ich Ihnen helfen?',
  '#2563EB',
  'bottom-right',
  '08:00',
  '20:00',
  'Wir sind gerade nicht erreichbar. Hinterlassen Sie uns Ihre Kontaktdaten und wir melden uns schnellstmoeglich bei Ihnen!',
  true,
  'freundlich'
);
