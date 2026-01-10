-- Migration: Seed Logistics Settings (Transport & Installation)
-- Created: 2026-01-11
-- Description: Inserts default values for 'transport_settings' and 'installation_settings' to ensure Calculator works immediately.

-- 1. Default Transport Settings
INSERT INTO app_settings (key, value)
VALUES (
    'transport_settings',
    '{
        "ratePerKm": 0.50,
        "baseLocation": {
            "name": "Gubin",
            "postalCode": "66-620",
            "lat": 51.9494,
            "lng": 14.7242
        }
    }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- 2. Default Installation Settings
INSERT INTO app_settings (key, value)
VALUES (
    'installation_settings',
    '{
        "baseRatePerDay": 790,
        "minInstallationCost": 1000
    }'::jsonb
) ON CONFLICT (key) DO NOTHING;
