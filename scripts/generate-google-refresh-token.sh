#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Google OAuth Refresh Token Generator for Google Ads API
# ═══════════════════════════════════════════════════════════════
#
# INSTRUKCJA:
#
# 1. Wpisz swoje CLIENT_ID i CLIENT_SECRET poniżej
# 2. Uruchom: bash scripts/generate-google-refresh-token.sh
# 3. Otwórz URL w przeglądarce
# 4. Zaloguj się i zatwierdź dostęp
# 5. Skopiuj "code" z URL po przekierowaniu
# 6. Wklej code w terminalu
# 7. Otrzymasz nowy refresh_token → wklej do Supabase secrets
#

# ═══ WYPEŁNIJ TE WARTOŚCI ═══
CLIENT_ID="${GOOGLE_OAUTH_CLIENT_ID:-WPISZ_CLIENT_ID}"
CLIENT_SECRET="${GOOGLE_OAUTH_CLIENT_SECRET:-WPISZ_CLIENT_SECRET}"
REDIRECT_URI="http://localhost:8080/callback"

# Scopes wymagane dla Google Ads API
SCOPES="https://www.googleapis.com/auth/adwords"

echo "════════════════════════════════════════════"
echo "  Google OAuth Refresh Token Generator"
echo "════════════════════════════════════════════"
echo ""
echo "Krok 1: Otwórz ten URL w przeglądarce:"
echo ""
echo "https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPES}&access_type=offline&prompt=consent"
echo ""
echo "Krok 2: Zaloguj się i zatwierdź dostęp"
echo "Krok 3: Po przekierowaniu skopiuj wartość 'code' z URL"
echo "        (URL będzie: http://localhost:8080/callback?code=XXXXX&scope=...)"
echo ""
read -p "Krok 4: Wklej code tutaj: " AUTH_CODE
echo ""
echo "Wymieniam code na refresh token..."
echo ""

# Exchange code for tokens
RESPONSE=$(curl -s -X POST https://oauth2.googleapis.com/token \
  -d "code=${AUTH_CODE}" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "redirect_uri=${REDIRECT_URI}" \
  -d "grant_type=authorization_code")

echo "Odpowiedź Google:"
echo "${RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${RESPONSE}"
echo ""

# Extract refresh_token
REFRESH_TOKEN=$(echo "${RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('refresh_token', 'BRAK'))" 2>/dev/null)

if [ "${REFRESH_TOKEN}" != "BRAK" ] && [ -n "${REFRESH_TOKEN}" ]; then
  echo "════════════════════════════════════════════"
  echo "✅ NOWY REFRESH TOKEN:"
  echo ""
  echo "${REFRESH_TOKEN}"
  echo ""
  echo "════════════════════════════════════════════"
  echo ""
  echo "Wklej go do Supabase:"
  echo "  supabase secrets set GOOGLE_OAUTH_REFRESH_TOKEN=${REFRESH_TOKEN}"
  echo ""
else
  echo "❌ Nie udało się uzyskać refresh token."
  echo "   Sprawdź czy CLIENT_ID, CLIENT_SECRET i REDIRECT_URI są poprawne."
  echo "   Sprawdź czy redirect URI jest dodane w Google Cloud Console → Credentials."
fi
