# Instrukcja: Uruchomienie skryptów SQL w Supabase

## ⚠️ WAŻNE: Kolejność ma znaczenie

Musisz uruchomić **DWA** skrypty SQL w **OKREŚLONEJ KOLEJNOŚCI**.

---

## KROK 1: Utwórz tabele (supabase_migration.sql)

### 1.1 Otwórz SQL Editor

1. Zaloguj się do [supabase.com](https://supabase.com)
2. Wybierz swój projekt
3. Kliknij **"SQL Editor"** w menu bocznym
4. Kliknij **"New query"**

### 1.2 Uruchom podstawowy skrypt

1. Otwórz plik **`supabase_migration.sql`**
2. Zaznacz całą zawartość (Ctrl+A / Cmd+A)
3. Skopiuj (Ctrl+C / Cmd+C)
4. Wklej do SQL Editor w Supabase
5. Kliknij **"RUN"**

✅ Powinieneś zobaczyć: "Success. No rows returned"

---

## KROK 2: Zaktualizuj role (update_roles.sql)

### 2.1 Nowe zapytanie

1. Kliknij ponownie **"New query"** w SQL Editor
2. Otwórz plik **`update_roles.sql`**
3. Zaznacz całą zawartość
4. Skopiuj i wklej do SQL Editor
5. Kliknij **"RUN"**

✅ Powinieneś zobaczyć: "Success. No rows returned"

---

## Co robią te skrypty?

### supabase_migration.sql

- Tworzy tabele: `profiles`, `offers`, `contracts`, `installations`, `reports`
- Ustawia polityki bezpieczeństwa (RLS)
- Tworzy indeksy
- Dodaje triggery

### update_roles.sql

- Dodaje obsługę ról: `sales_rep` i `manager`
- Aktualizuje funkcję rejestracji użytkowników

---

## Co dalej?

Po uruchomieniu **OBIE** skryptów:

1. Przejdź do `/register` w aplikacji
2. Zarejestruj nowego użytkownika
3. Sprawdź w Supabase → Table Editor → profiles, czy użytkownik został utworzony
