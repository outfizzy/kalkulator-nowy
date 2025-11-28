# 🔑 Gdzie znaleźć klucze Supabase i jak je wkleić w Vercel

## Część 1: Znajdowanie kluczy w Supabase

### Krok 1: Zaloguj się do Supabase

1. Otwórz <https://supabase.com>
2. Kliknij "Sign In" (w prawym górnym rogu)
3. Zaloguj się przez GitHub lub email

### Krok 2: Wybierz swój projekt

Po zalogowaniu zobaczysz listę projektów. **Kliknij** na projekt związany z aplikacją ofert.

### Krok 3: Przejdź do Settings → API

1. Po lewej stronie, na samym dole menu, znajdź ikonę **⚙️ (koła zębatego)**
2. **Kliknij** na "Settings"
3. W podmenu po lewej znajdź i **kliknij** na **"API"**

### Krok 4: Skopiuj klucze

Teraz zobaczysz stronę z tytułem "API Settings". Są tam dwa kluczowe pola:

#### A. Project URL

```
Configuration > Project URL
```

Pole zawiera adres typu: `https://abcdefgh.supabase.co`

**Co zrobić:**

- Kliknij małą ikonę **kopiowania** (📋) obok tego pola
- Klucz został skopiowany do schowka!
- **Zapisz go gdzieś** (np. Notatnik) na potrzeby następnego kroku

#### B. anon / public key

```
Project API keys > anon public
```

Pole zawiera długi ciąg znaków (kilkaset znaków) zaczynający się od `eyJ...`

**Co zrobić:**

- Kliknij małą ikonę **kopiowania** (📋) obok tego pola
- Klucz został skopiowany do schowka!
- **Zapisz go też** (np. Notatnik)

---

## Część 2: Wklejanie kluczy w Vercel

### Krok 1: Zaloguj się do Vercel

1. Otwórz <https://vercel.com>
2. Kliknij "Login" (w prawym górnym rogu)
3. Zaloguj się (prawdopodobnie przez GitHub)

### Krok 2: Znajdź swój projekt

Na stronie głównej (Dashboard) zobaczysz listę projektów.

**Znajdź projekt** o nazwie podobnej do:

- `offer`
- `offer-app`
- `offer-msj07wc4o`

**Kliknij** na ten projekt, żeby go otworzyć.

### Krok 3: Przejdź do Settings

W górnym menu projektu znajdziesz kilka zakładek:

- Overview
- Deployments
- Analytics
- **Settings** ← **KLIKNIJ TUTAJ**

### Krok 4: Otwórz Environment Variables

Po lewej stronie zobaczysz menu. **Kliknij** na:

```
Environment Variables
```

### Krok 5: Dodaj pierwszą zmienną (URL)

Zobaczysz przycisk **"Add New" lub "Create"**. **Kliknij** na niego.

Pojawi się formularz z trzema polami:

**1. Name (Nazwa):**

```
NEXT_PUBLIC_SUPABASE_URL
```

↑ Wpisz to DOKŁADNIE tak jak powyżej (możesz skopiować)

**2. Value (Wartość):**

```
Wklej tutaj URL skopiowany z Supabase
(ten zaczynający się od https://...)
```

**3. Environment (Środowisko):**
Zaznacz WSZYSTKIE checkboxy:

- ☑️ Production
- ☑️ Preview  
- ☑️ Development

**Kliknij "Save"**

### Krok 6: Dodaj drugą zmienną (Anon Key)

Ponownie kliknij **"Add New" / "Create"**

**1. Name (Nazwa):**

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

↑ Wpisz to DOKŁADNIE tak jak powyżej

**2. Value (Wartość):**

```
Wklej tutaj klucz anon skopiowany z Supabase
(ten długi, zaczynający się od eyJ...)
```

**3. Environment:**
Zaznacz WSZYSTKIE checkboxy:

- ☑️ Production
- ☑️ Preview
- ☑️ Development

**Kliknij "Save"**

---

## Część 3: Przebudowa aplikacji (Redeploy)

### Ważne

Po dodaniu zmiennych środowiskowych aplikacja musi zostać przebudowana.

1. **Kliknij** zakładkę **"Deployments"** (u góry)
2. Zobaczysz listę deploymentów
3. **Pierwszy/najnowszy** na liście → kliknij **trzy kropki (...)** po prawej
4. Wybierz **"Redeploy"**
5. W oknie dialogowym kliknij **"Redeploy"** jeszcze raz

Poczekaj ~1-2 minuty. Gdy status zmieni się na ✅ "Ready" - gotowe!

---

## ✅ Gotowe

Twoja aplikacja ma teraz dostęp do Supabase!

Możesz ją otworzyć klikając na nazwę deploymentu i przycisk "Visit".

---

## 🆘 Nadal nie możesz znaleźć?

Jeśli coś jest niejasne:

1. Zrób screenshot tego co widzisz w Supabase → Settings → API
2. Zrób screenshot tego co widzisz w Vercel → Settings → Environment Variables
3. Pokaż mi, a dokładnie wskażę gdzie kliknąć
