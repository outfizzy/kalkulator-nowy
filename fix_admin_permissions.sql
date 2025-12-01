-- Skrypt naprawiający uprawnienia administratora
-- Ustawia rolę 'admin' i status 'active' dla podanych adresów email

UPDATE profiles
SET 
    role = 'admin',
    status = 'active',
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('admin@example.com', 'tomasz.fijolek@gmail.com')
);

-- Sprawdzenie wyników
SELECT 
    p.id,
    u.email,
    p.role,
    p.status
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email IN ('admin@example.com', 'tomasz.fijolek@gmail.com');
