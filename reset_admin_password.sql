-- Skrypt resetujący hasło dla admin@example.com
-- UWAGA: To tylko aktualizuje hasło w auth.users, jeśli użytkownik istnieje.
-- Jeśli użytkownik nie istnieje, trzeba go najpierw utworzyć przez API/Dashboard.

UPDATE auth.users
SET encrypted_password = crypt('admin123', gen_salt('bf'))
WHERE email = 'admin@example.com';

-- Upewnij się też, że profil ma rolę admin (to już robiliśmy, ale dla pewności)
UPDATE profiles
SET role = 'admin', status = 'active'
WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@example.com');
