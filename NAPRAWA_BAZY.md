# Instrukcja Naprawy Błędu Rejestracji

Wystąpił błąd bazy danych, ponieważ brakowało kolumny `phone` w tabeli użytkowników.

## Rozwiązanie

1. Wejdź do [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Utwórz nowe zapytanie (New Query)
3. Wklej i uruchom ten kod:

```sql
-- Dodaj kolumnę phone
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Zaktualizuj funkcję tworzenia użytkownika
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
```

Po wykonaniu tego skryptu, wróć na stronę rejestracji i spróbuj ponownie. Powinno zadziałać!
