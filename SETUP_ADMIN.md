# Instrukcje Wdrożenia i Utworzenia Konta Admina

## 🚀 Krok 1: Deploy na Vercel

### Opcja A: Przez Vercel Dashboard (ZALECANE)

1. **Otwórz** [vercel.com](https://vercel.com)
2. **Zaloguj się** (przez GitHub)
3. **Kliknij** "Add New Project"
4. **Importuj** z GitHub lub przesłać ręcznie folder `offer-app`
5. **Skonfiguruj projekt:**
   - Framework Preset: **Vite**
   - Root Directory: `./` (domyślnie)
   - Build Command: `npm run build` (domyślnie)
   - Output Directory: `dist` (domyślnie)

6. **Dodaj Environment Variables:**

   Kliknij "Environment Variables" i dodaj:

   **NEXT_PUBLIC_SUPABASE_URL**

   ```
   https://twoj-projekt.supabase.co
   ```

   **NEXT_PUBLIC_SUPABASE_ANON_KEY**

   ```
   twoj-klucz-anon
   ```

7. **Kliknij "Deploy"**

Poczekaj kilka minut. Po zakończeniu otrzymasz link (np. `https://offer-app-xyz.vercel.app`).

---

### Opcja B: Przez Vercel CLI

Jeśli Vercel CLI NIE jest zainstalowany, zainstaluj:

```bash
npm i -g vercel
```

Następnie w folderze projektu:

```bash
cd "/Users/tomaszfijolek/Desktop/Program do ofert /offer-app"

# Zaloguj się
vercel login

# Deploy
vercel

# Dodaj ENV variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Wpisz wartość i Enter

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Wpisz wartość i Enter

# Redeploy z ENV
vercel --prod
```

---

## 👤 Krok 2: Utwórz Konto Administratora

### 2.1 Zarejestruj konto przez aplikację

1. **Otwórz** deployed app (lub localhost:5173)
2. **Przejdź** do `/register`
3. **Wypełnij formularz:**
   - Imię: Tomasz
   - Nazwisko: Fijolek
   - Email: **<tomasz.fijolek@gmail.com>**
   - Telefon: (twój numer)
   - Rola: **Administrator**
   - Hasło: **polend@ch24admin1**
   - Potwierdź hasło: **polend@ch24admin1**
4. **Kliknij** "Zarejestruj się"
5. **Sprawdź email** i potwierdź konto (jeśli wymagane)

### 2.2 Aktywuj konto w Supabase

1. **Otwórz** [supabase.com](https://supabase.com) → Twój projekt
2. **Przejdź** do SQL Editor
3. **Skopiuj i uruchom** poniższy skrypt:

```sql
-- Aktywuj konto i nadaj rolę administratora
UPDATE profiles
SET 
    role = 'admin',
    status = 'active',
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email = 'tomasz.fijolek@gmail.com'
);

-- Sprawdź czy się udało
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.status,
    u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'tomasz.fijolek@gmail.com';
```

Powinno zwrócić rekord z `role = 'admin'` i `status = 'active'`.

### 2.3 Zaloguj się jako administrator

1. **Otwórz** aplikację
2. **Przejdź** do `/login`
3. **Wpisz** email: <tomasz.fijolek@gmail.com>
4. **Kliknij** "Wyślij link do logowania"
5. **Sprawdź email** i kliknij w link (Magic Link)

Lub jeśli używasz hasła:

- Login przez formularz z hasłem: **polend@ch24admin1**

Po zalogowaniu w menu bocznym powinien pojawić się punkt **"Użytkownicy"**.

---

## ✅ Krok 3: Sprawdź Panel Administracyjny

1. W menu bocznym kliknij **"Użytkownicy"**
2. Powinieneś zobaczyć listę wszystkich użytkowników
3. Możesz akceptować/blokować użytkowników

---

## 🎉 Gotowe

Aplikacja jest wdrożona i konto administratora gotowe do użycia.

### Adres aplikacji

- **Produkcja:** `https://twoja-app.vercel.app`
- **Lokalnie:** `http://localhost:5173`

### Dane logowania admina

- **Email:** <tomasz.fijolek@gmail.com>
- **Hasło:** polend@ch24admin1

---

## Rozwiązywanie problemów

### Nie mogę się zalogować jako admin?

- Sprawdź w Supabase Table Editor → `profiles` czy `status = 'active'`
- Sprawdź czy `role = 'admin'`

### Panel użytkowników nie pokazuje się?

- Upewnij się, że jesteś zalogowany jako admin
- Sprawdź w konsoli przeglądarki czy są błędy

### Vercel deployment nie działa?

- Sprawdź logi: Vercel Dashboard → Deployments → [deployment] → View Function Logs
- Sprawdź czy environment variables są dodane
