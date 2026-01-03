ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS commission_config JSONB DEFAULT '{"enableMarginBonus": false, "enableVolumeBonus": false}';
