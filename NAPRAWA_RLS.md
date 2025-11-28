# Naprawa Błędu "Infinite Recursion" (Pętla w uprawnieniach)

Błąd, który widzisz, wynika z tego, że baza danych wpada w pętlę sprawdzając uprawnienia (np. "czy mogę czytać ten profil? -> sprawdź czy jestem adminem -> żeby sprawdzić czy jestem adminem, muszę przeczytać profil -> czy mogę czytać ten profil? ...").

## Rozwiązanie

1. Wejdź do [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql).
2. Utwórz nowe zapytanie (New Query).
3. Wklej i uruchom poniższy kod, który zresetuje i naprawi uprawnienia:

```sql
-- 1. Usuń stare polityki, które powodują pętlę
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users who created them." ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by admins." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;

-- 2. Włącz RLS (dla pewności)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Stwórz bezpieczną funkcję sprawdzającą czy ktoś jest adminem (omija RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Dodaj nowe, proste polityki

-- Każdy może zobaczyć SWÓJ profil
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Admin może zobaczyć WSZYSTKIE profile
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (is_admin());

-- System (trigger) może tworzyć profile przy rejestracji
CREATE POLICY "System can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Użytkownik może edytować SWÓJ profil
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Admin może edytować WSZYSTKIE profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (is_admin());
```

Po wykonaniu tego skryptu:

1. Spróbuj się zalogować.
2. Jeśli zobaczysz komunikat "Twoje konto oczekuje na zatwierdzenie...", to znaczy, że naprawiliśmy błąd bazy danych!
3. Wtedy uruchom jeszcze ten krótki kod, aby aktywować swoje konto admina:

```sql
UPDATE public.profiles
SET role = 'admin', status = 'active'
WHERE id = auth.uid();
```

(Uruchom to będąc zalogowanym w SQL Editorze, lub podmień `auth.uid()` na ID swojego użytkownika, jeśli wiesz jak je znaleźć. Najprościej użyć maila jak poniżej):

```sql
UPDATE public.profiles
SET role = 'admin', status = 'active'
WHERE id IN (SELECT id FROM auth.users WHERE email = 'tomasz.fijolek@gmail.com');
```
