-- Naprawa schematu bazy danych
-- Dodanie brakującej kolumny 'phone' do tabeli profiles i naprawa ról

-- 1. Dodaj kolumnę phone jeśli nie istnieje
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN 
        ALTER TABLE public.profiles ADD COLUMN phone TEXT; 
    END IF; 
END $$;

-- 2. Napraw nieprawidłowe role PRZED dodaniem constrainta
-- Ustaw domyślną rolę 'sales_rep' dla wszystkich, którzy mają nieznaną rolę
UPDATE public.profiles 
SET role = 'sales_rep' 
WHERE role NOT IN ('admin', 'user', 'sales_rep', 'manager') 
   OR role IS NULL;

-- 3. Upewnij się, że constraint ról jest poprawny
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'user', 'sales_rep', 'manager'));

-- 4. Upewnij się, że constraint statusu jest poprawny
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check 
    CHECK (status IN ('pending', 'active', 'blocked'));

-- 5. Odśwież definicję funkcji triggera (dla pewności)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'sales_rep'),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'pending'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
