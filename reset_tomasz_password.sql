-- Reset hasła i roli dla tomasz.fijolek@gmail.com

-- 1. Ustawienie hasła na 'admin123'
UPDATE auth.users
SET encrypted_password = crypt('admin123', gen_salt('bf'))
WHERE email = 'tomasz.fijolek@gmail.com';

-- 2. Ustawienie roli admin i statusu active
UPDATE profiles
SET 
    role = 'admin',
    status = 'active',
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email = 'tomasz.fijolek@gmail.com'
);

-- Sprawdzenie
SELECT p.full_name, p.role, p.status, u.email 
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'tomasz.fijolek@gmail.com';
