-- Sprawdzenie emaila montera
SELECT 
    p.full_name,
    u.email,
    p.role
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'installer';
