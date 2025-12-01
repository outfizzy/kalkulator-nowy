-- Naprawa widoczności montaży dla monterów
-- Monterzy muszą mieć prawo do odczytu tabeli 'installations', jeśli są do niej przypisani.

-- 1. Włączamy RLS na tabeli installations (jeśli nie jest włączone)
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;

-- 2. Dodajemy politykę dla monterów
-- "Monter widzi instalację, jeśli istnieje wpis w installation_assignments łączący go z tą instalacją"
DROP POLICY IF EXISTS "Installers can view assigned installations" ON installations;

CREATE POLICY "Installers can view assigned installations" ON installations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM installation_assignments ia
            WHERE ia.installation_id = id
            AND ia.user_id = auth.uid()
        )
    );

-- 3. Upewniamy się, że admini widzą wszystko
DROP POLICY IF EXISTS "Admins and managers can view all installations" ON installations;

CREATE POLICY "Admins and managers can view all installations" ON installations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Sprawdzenie czy polityki zostały dodane
SELECT * FROM pg_policies WHERE tablename = 'installations';
