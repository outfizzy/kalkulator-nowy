# Wdrożenie na Vercel

## Przygotowanie

### 1. Zainstaluj Vercel CLI (opcjonalnie)

```bash
npm i -g vercel
```

### 2. Sprawdź, czy projekt się buduje

```bash
npm run build
```

Jeśli build się powiedzie, możesz kontynuować.

---

## Wdrożenie przez Vercel Dashboard (REKOMENDOWANE)

### Krok 1: Utwórz konto na Vercel

1. Przejdź do [vercel.com](https://vercel.com)
2. Zaloguj się przez GitHub

### Krok 2: Importuj projekt

1. Kliknij **"Add New Project"**
2. Wybierz **"Import Git Repository"**
3. Podłącz swoje repozytorium GitHub (lub przesyłaj ręcznie)
4. Wybierz folder projektu: `Program do ofert /offer-app`

### Krok 3: Skonfiguruj zmienne środowiskowe

W sekcji "Environment Variables" dodaj:

**Nazwa:** `NEXT_PUBLIC_SUPABASE_URL`  
**Wartość:** Twój URL Supabase (np. `https://xxxxx.supabase.co`)

**Nazwa:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**Wartość:** Twój klucz anon Supabase

> ⚠️ **WAŻNE:** Te same wartości jak w `.env.local`

### Krok 4: Deploy

1. Kliknij **"Deploy"**
2. Poczekaj kilka minut na zbudowanie projektu
3. Po zakończeniu otrzymasz link do aplikacji (np. `https://twoja-app.vercel.app`)

---

## Wdrożenie przez CLI (alternatywa)

### Krok 1: Zaloguj się

```bash
cd "/Users/tomaszfijolek/Desktop/Program do ofert /offer-app"
vercel login
```

### Krok 2: Deploy

```bash
vercel
```

Postępuj zgodnie z instrukcjami:

- Project name: **offer-app** (lub dowolna nazwa)
- Link to existing project? **N** (pierwsz y raz)

### Krok 3: Dodaj zmienne środowiskowe

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Wklej wartość i naciśnij Enter

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Wklej wartość i naciśnij Enter
```

### Krok 4: Deploy ponownie z ENV

```bash
vercel --prod
```

---

## Po wdrożeniu

### Sprawdź działanie

1. Otwórz deployed URL
2. Przejdź do `/register`
3. Zarejestruj użytkownika testowego
4. Sprawdź w Supabase, czy użytkownik został utworzony
5. Zaloguj się jako admin i zatwierdź użytkownika
6. Przetestuj logowanie

### Aktualizacje

Każde `git push` do głównej gałęzi automatycznie zdeployuje nową wersję (jeśli używasz GitHub integration).

---

## Rozwiązywanie problemów

### Build fails?

- Sprawdź logi budowania w Vercel Dashboard
- Upewnij się, że `npm run build` działa lokalnie
- Sprawdź czy wszystkie zależności są w `package.json`

### Aplikacja nie łączy się z Supabase?

- Sprawdź zmienne środowiskowe w Vercel → Settings → Environment Variables
- Upewnij się, że URL i klucz są poprawne
- Sprawdź polityki CORS w Supabase Dashboard

### Routing nie działa (404)?

- Upewnij się, że plik `vercel.json` jest w katalogu głównym
- Sprawdź czy rewrites są poprawnie skonfigurowane

---

## Bezpieczeństwo

⚠️ **NIE COMMITUJ `.env.local` do Git!**

Plik `.gitignore` już zawiera `.env.local`, więc jest bezpieczny.
Zmienne środowiskowe dodawaj TYLKO przez Vercel Dashboard.

---

## Wsparcie

W razie problemów:

- Sprawdź logi: Vercel Dashboard → Deployments → [Deployment] → View Function Logs
- Dokumentacja: [vercel.com/docs](https://vercel.com/docs)
