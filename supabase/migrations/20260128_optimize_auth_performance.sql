-- Optymalizacja wydajności logowania i RLS
-- Dodanie indeksów i funkcji pomocniczych

-- 1. Dodaj indeksy na tabeli profiles dla szybszego sprawdzania ról
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);

-- 2. Funkcja pomocnicza do sprawdzania roli użytkownika (Pattern 416-418)
-- Ta funkcja jest SECURITY DEFINER, więc omija RLS i jest szybsza
CREATE OR REPLACE FUNCTION public.check_user_role(required_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    -- Pobierz rolę użytkownika z tabeli profiles
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'active'
    LIMIT 1;
    
    -- Sprawdź czy rola użytkownika jest w wymaganych rolach
    RETURN user_role = ANY(required_roles);
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- 3. Funkcja do sprawdzania czy użytkownik jest adminem (najczęściej używana)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    );
END;
$$;

-- 4. Funkcja do sprawdzania czy użytkownik jest admin lub manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
        AND status = 'active'
    );
END;
$$;

-- 5. Dodaj komentarze dla dokumentacji
COMMENT ON FUNCTION public.check_user_role IS 'Sprawdza czy użytkownik ma jedną z wymaganych ról. SECURITY DEFINER dla wydajności.';
COMMENT ON FUNCTION public.is_admin IS 'Szybkie sprawdzenie czy użytkownik jest adminem. STABLE dla cache.';
COMMENT ON FUNCTION public.is_admin_or_manager IS 'Szybkie sprawdzenie czy użytkownik jest adminem lub managerem. STABLE dla cache.';

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.check_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager TO authenticated;
