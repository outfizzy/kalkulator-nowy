-- Skrypt tworzący dane testowe (Poprawiony - dodano snow_zone)

-- 1. Upewniamy się, że mamy montera
UPDATE profiles 
SET role = 'installer' 
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- Tworzenie przykładowej oferty
INSERT INTO offers (
    id, user_id, offer_number, customer_data, product_config, pricing, status, margin_percentage, created_at, updated_at, snow_zone
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM profiles LIMIT 1),
    'OFF/TEST/001',
    '{"firstName": "Jan", "lastName": "Kowalski", "address": "Testowa 1, Warszawa", "phone": "123456789", "email": "jan@test.pl"}',
    '{}',
    '{}',
    'accepted',
    0.3,
    NOW(),
    NOW(),
    '{"zone": 1, "load": 0.7}' -- Przykładowa strefa śniegowa
);

-- Tworzenie instalacji dla tej oferty
INSERT INTO installations (
    id, offer_id, user_id, scheduled_date, status, installation_data, created_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM offers WHERE offer_number = 'OFF/TEST/001' LIMIT 1),
    (SELECT id FROM profiles LIMIT 1),
    NOW() + INTERVAL '1 day',
    'scheduled',
    '{"client": {"firstName": "Jan", "lastName": "Kowalski", "address": "Testowa 1, Warszawa", "phone": "123456789"}}',
    NOW()
);

-- Przypisanie instalacji do montera
INSERT INTO installation_assignments (installation_id, user_id)
SELECT 
    i.id,
    p.id
FROM installations i, profiles p
WHERE i.status = 'scheduled' AND p.role = 'installer'
LIMIT 1;

-- Sprawdzenie wyników
SELECT 
    i.id as installation_id,
    p.full_name as installer_name
FROM installation_assignments ia
JOIN installations i ON i.id = ia.installation_id
JOIN profiles p ON p.id = ia.user_id;
