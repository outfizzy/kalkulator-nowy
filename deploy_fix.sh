#!/bin/bash

# Kolory dla lepszej czytelności
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Asystent Wdrożenia Poprawki Cenników ===${NC}"
echo "Ten skrypt pomoże Ci wdrożyć naprawioną funkcję AI do Supabase."
echo ""

# 1. Sprawdź, czy użytkownik jest zalogowany
echo -e "${YELLOW}Krok 1: Sprawdzanie logowania do Supabase...${NC}"
if npx supabase projects list > /dev/null 2>&1; then
    echo -e "${GREEN}Jesteś zalogowany!${NC}"
else
    echo -e "${RED}Nie jesteś zalogowany.${NC}"
    echo "Zaloguj się teraz (otworzy się przeglądarka):"
    npx supabase login
fi

# 2. Pobierz ID projektu
echo ""
echo -e "${YELLOW}Krok 2: Konfiguracja Projektu${NC}"
PROJECT_ID="whgjsppyuvglhbdgdark"
echo "ID Projektu: $PROJECT_ID (ustawione automatycznie)"

# 3. Połącz projekt
echo ""
echo -e "${YELLOW}Krok 3: Łączenie z projektem $PROJECT_ID...${NC}"
npx supabase link --project-ref "$PROJECT_ID"

if [ $? -ne 0 ]; then
    echo -e "${RED}Błąd łączenia. Sprawdź hasło do bazy danych (jeśli pyta).${NC}"
    exit 1
fi

# 4. Wdrożenie funkcji
echo ""
echo -e "${YELLOW}Krok 4: Wdrażanie funkcji AI${NC}"
# Deploy specific functions 
npx supabase functions deploy parse-price-pdf --no-verify-jwt
npx supabase functions deploy voice-token --no-verify-jwt
npx supabase functions deploy parse-pricing-text --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=== SUKCES! ===${NC}"
    echo "Funkcja AI została zaktualizowana."
    echo "Teraz możesz wejść na Vercel i zaktualizować wygląd."
else
    echo ""
    echo -e "${RED}Wystąpił błąd podczas wdrażania funkcji.${NC}"
fi
