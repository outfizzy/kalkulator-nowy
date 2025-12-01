-- Tworzenie tabeli przypisań montaży do monterów
CREATE TABLE IF NOT EXISTS installation_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    installation_id UUID REFERENCES installations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(installation_id, user_id)
);

-- Nadanie uprawnień (jeśli RLS jest włączone)
ALTER TABLE installation_assignments ENABLE ROW LEVEL SECURITY;

-- Polityka dla adminów i managerów (pełny dostęp)
CREATE POLICY "Admins and managers can manage assignments" ON installation_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Polityka dla monterów (tylko odczyt własnych przypisań)
CREATE POLICY "Installers can view their assignments" ON installation_assignments
    FOR SELECT
    USING (
        user_id = auth.uid()
    );
