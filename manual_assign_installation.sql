-- Skrypt do ręcznego przypisania montażu do montera
-- Potrzebujemy ID montera i ID instalacji

-- 1. Znajdź ID montera (szukamy po emailu lub roli)
WITH installer AS (
    SELECT id FROM profiles WHERE role = 'installer' LIMIT 1
),
-- 2. Znajdź ID instalacji (bierzemy pierwszą lepszą)
installation AS (
    SELECT id FROM installations LIMIT 1
)
-- 3. Wstaw przypisanie
INSERT INTO installation_assignments (installation_id, user_id)
SELECT i.id, u.id
FROM installation i, installer u
WHERE NOT EXISTS (
    SELECT 1 FROM installation_assignments 
    WHERE installation_id = i.id AND user_id = u.id
);

-- Sprawdzenie
SELECT 
    ia.installation_id,
    p.full_name as installer_name,
    i.status
FROM installation_assignments ia
JOIN profiles p ON p.id = ia.user_id
JOIN installations i ON i.id = ia.installation_id;
