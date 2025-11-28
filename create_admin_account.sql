-- Skrypt do utworzenia konta administratora
-- Email: tomasz.fijolek@gmail.com
-- Hasło: polend@ch24admin1

-- UWAGA: Ten skrypt należy uruchomić RĘCZNIE w Supabase SQL Editor

-- Krok 1: Najpierw musisz zarejestrować użytkownika przez aplikację (/register)
-- lub utworzyć konto przez Supabase Auth UI

-- Krok 2: Po utworzeniu konta, uruchom poniższy skrypt, 
-- aby nadać rolę administratora i aktywować konto

-- Znajdź użytkownika i ustaw jako administratora
UPDATE profiles
SET 
    role = 'admin',
    status = 'active',
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email = 'tomasz.fijolek@gmail.com'
);

-- Sprawdzenie czy zaktualizowano
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.status,
    u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'tomasz.fijolek@gmail.com';
