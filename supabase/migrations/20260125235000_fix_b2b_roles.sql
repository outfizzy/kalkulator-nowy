-- Naprawa ról B2B i Partner
-- Dodanie brakujących ról: partner, b2b_partner, installer, b2b_manager

-- 1. Usuń stary constraint ról
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Dodaj nowy constraint z wszystkimi rolami
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'user', 'sales_rep', 'manager', 'partner', 'b2b_partner', 'installer', 'b2b_manager'));

-- 3. Zaktualizuj funkcję handle_new_user żeby obsługiwała dane z rejestracji B2B
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_company TEXT;
    user_nip TEXT;
BEGIN
    -- Wyciągnij rolę z metadanych (domyślnie sales_rep)
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'sales_rep');
    user_company := NEW.raw_user_meta_data->>'companyName';
    user_nip := NEW.raw_user_meta_data->>'nip';
    
    -- Walidacja roli - sprawdź czy jest dozwolona
    IF user_role NOT IN ('admin', 'user', 'sales_rep', 'manager', 'partner', 'b2b_partner', 'installer', 'b2b_manager') THEN
        user_role := 'sales_rep';
    END IF;
    
    INSERT INTO public.profiles (id, full_name, role, phone, status, company_name, nip)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        user_role,
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'pending',
        user_company,
        user_nip
    );
    
    -- Jeśli to partner B2B, automatycznie utwórz rekord w b2b_partners
    IF user_role = 'b2b_partner' AND user_company IS NOT NULL THEN
        INSERT INTO public.b2b_partners (
            user_id,
            company_name,
            tax_id,
            contact_email,
            contact_phone,
            status,
            tier,
            payment_terms_days,
            credit_limit,
            credit_used
        )
        VALUES (
            NEW.id,
            user_company,
            user_nip,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'phone', ''),
            'pending',
            'standard',
            14,
            0,
            0
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Upewnij się że trigger istnieje
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
